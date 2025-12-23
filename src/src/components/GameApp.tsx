import { useMemo, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContract } from 'wagmi';
import { Contract } from 'ethers';
import { GameBoard } from './GameBoard';
import { CONTRACT_ABI, CONTRACT_ADDRESS } from '../config/contracts';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import '../styles/game.css';

type DirectionKey = 'up' | 'down' | 'left' | 'right';

const directionCodes: Record<DirectionKey, number> = {
  up: 0,
  down: 1,
  left: 2,
  right: 3,
};

const directionLabels: Record<DirectionKey, string> = {
  up: 'North',
  down: 'South',
  left: 'West',
  right: 'East',
};

export function GameApp() {
  const { address, isConnected } = useAccount();
  const signerPromise = useEthersSigner();
  const { instance, isLoading: zamaLoading, error: zamaError } = useZamaInstance();
  const contractReady = true;

  const [pendingAction, setPendingAction] = useState<null | 'join' | 'move' | 'decrypt'>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Every position stays encrypted until you decrypt it.');
  const [decryptedPosition, setDecryptedPosition] = useState<{ x: number; y: number } | null>(null);
  const [lastDirection, setLastDirection] = useState<string>('');

  const { data: limitsData } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'boardLimits',
    query: { enabled: contractReady },
  });

  const minCoord = useMemo(() => (limitsData ? Number(limitsData[0]) : 1), [limitsData]);
  const maxCoord = useMemo(() => (limitsData ? Number(limitsData[1]) : 10), [limitsData]);

  const {
    data: joinedData,
    refetch: refetchJoined,
    isFetching: fetchingJoined,
  } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'hasJoined',
    args: address ? [address] : undefined,
    query: { enabled: !!address && contractReady },
  });
  const joined = Boolean(joinedData);

  const {
    data: positionData,
    refetch: refetchPosition,
    isFetching: fetchingPosition,
  } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getPlayerPosition',
    args: address ? [address] : undefined,
    query: { enabled: !!address && joined && contractReady },
  });

  const resetAfterChainChange = () => {
    setDecryptedPosition(null);
    setLastDirection('');
    setStatusMessage('Every position stays encrypted until you decrypt it.');
  };

  const handleJoin = async () => {
    if (!contractReady) {
      setStatusMessage('Deploy the contract to Sepolia and update CONTRACT_ADDRESS before joining.');
      return;
    }

    if (!isConnected || !address) {
      setStatusMessage('Connect your wallet to join the encrypted grid.');
      return;
    }

    const signer = await signerPromise;
    if (!signer) {
      setStatusMessage('No signer detected. Please reconnect your wallet.');
      return;
    }

    setPendingAction('join');
    setStatusMessage('Requesting a random encrypted coordinate from the contract...');
    setDecryptedPosition(null);

    try {
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.joinGame();
      await tx.wait();

      await refetchJoined?.();
      await refetchPosition?.();

      setStatusMessage('Joined. Decrypt to reveal your secret starting tile.');
    } catch (error) {
      setStatusMessage(`Join failed: ${(error as Error).message}`);
    } finally {
      setPendingAction(null);
    }
  };

  const handleMove = async (direction: DirectionKey) => {
    if (!joined) {
      setStatusMessage('Join the game before moving.');
      return;
    }

    if (!contractReady) {
      setStatusMessage('Deploy the contract to Sepolia and update CONTRACT_ADDRESS before moving.');
      return;
    }

    if (!instance || zamaLoading) {
      setStatusMessage('Encryption service is still loading. Please wait a moment.');
      return;
    }

    const signer = await signerPromise;
    if (!signer || !address) {
      setStatusMessage('No signer detected. Please reconnect your wallet.');
      return;
    }

    setPendingAction('move');
    setLastDirection(directionLabels[direction]);
    setStatusMessage(`Encrypting move ${directionLabels[direction]}...`);

    try {
      const encryptedDirection = await instance.createEncryptedInput(CONTRACT_ADDRESS, address).add32(directionCodes[direction]).encrypt();
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.move(encryptedDirection.handles[0], encryptedDirection.inputProof);
      await tx.wait();

      await refetchPosition?.();
      setDecryptedPosition(null);
      setStatusMessage(`Move ${directionLabels[direction]} confirmed. Decrypt to see the new coordinate.`);
    } catch (error) {
      setStatusMessage(`Move failed: ${(error as Error).message}`);
    } finally {
      setPendingAction(null);
    }
  };

  const decryptPosition = async () => {
    if (!joined) {
      setStatusMessage('Join first, then decrypt your position.');
      return;
    }
    if (!contractReady) {
      setStatusMessage('Deploy the contract to Sepolia and update CONTRACT_ADDRESS before decrypting.');
      return;
    }
    if (!instance || zamaLoading) {
      setStatusMessage('Encryption service is still loading. Please wait a moment.');
      return;
    }
    if (!address || !positionData) {
      setStatusMessage('No position found to decrypt. Try refetching.');
      return;
    }

    const signer = await signerPromise;
    if (!signer) {
      setStatusMessage('No signer detected. Please reconnect your wallet.');
      return;
    }

    const xHandle = positionData[0] as string;
    const yHandle = positionData[1] as string;

    setPendingAction('decrypt');
    setStatusMessage('Preparing decryption request for your coordinates...');

    try {
      const keypair = instance.generateKeypair();
      const handleContractPairs = [
        { handle: xHandle, contractAddress: CONTRACT_ADDRESS },
        { handle: yHandle, contractAddress: CONTRACT_ADDRESS },
      ];

      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '7';
      const contractAddresses = [CONTRACT_ADDRESS];
      const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTimeStamp, durationDays);

      const signature = await signer.signTypedData(
        eip712.domain,
        { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        eip712.message
      );

      const result = await instance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x', ''),
        contractAddresses,
        address,
        startTimeStamp,
        durationDays
      );

      const x = Number(result[xHandle]);
      const y = Number(result[yHandle]);
      setDecryptedPosition({ x, y });
      setStatusMessage(`Position decrypted: (${x}, ${y}).`);
    } catch (error) {
      setStatusMessage(`Decryption failed: ${(error as Error).message}`);
    } finally {
      setPendingAction(null);
    }
  };

  const loadingCopy = useMemo(() => {
    if (pendingAction === 'join') return 'Joining...';
    if (pendingAction === 'move') return `Moving ${lastDirection || ''}`.trim();
    if (pendingAction === 'decrypt') return 'Decrypting...';
    if (fetchingJoined || fetchingPosition) return 'Syncing with chain...';
    return '';
  }, [pendingAction, lastDirection, fetchingJoined, fetchingPosition]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">CryptoVeil</p>
          <h1 className="title">Encrypted Grid Explorer</h1>
          <p className="muted">
            Join a 10 × 10 world, keep your coordinates hidden, move with encrypted directions, and decrypt only when you need to.
          </p>
        </div>
        <div className="connect-area">
          <div className={`pill ${contractReady ? 'success' : 'warning'}`}>
            {contractReady ? 'Contract linked' : 'Set contract address'}
          </div>
          <ConnectButton />
          <div className="pill">
            {zamaLoading ? 'Loading Zama relayer...' : zamaError ? 'Relayer unavailable' : 'FHE ready'}
          </div>
        </div>
      </header>

      <div className="content-grid">
        <section className="panel">
          <div className="card-header">
            <div>
              <p className="eyebrow">Actions</p>
              <h3 className="card-title">Control center</h3>
            </div>
            <div className="chip">
              Board {minCoord} - {maxCoord}
            </div>
          </div>

          <div className="action-row">
            <div className="action-card">
              <h4>Join</h4>
              <p className="muted">We mint a random encrypted coordinate for you on-chain.</p>
              <button
                className="primary"
                onClick={handleJoin}
                disabled={pendingAction !== null || !isConnected || joined}
              >
                {pendingAction === 'join' ? 'Joining...' : joined ? 'Already joined' : 'Join the grid'}
              </button>
            </div>

            <div className="action-card">
              <h4>Decrypt</h4>
              <p className="muted">Decrypt your x/y handles with your own keypair.</p>
              <button
                className="secondary"
                onClick={decryptPosition}
                disabled={pendingAction !== null || !joined || !positionData}
              >
                {pendingAction === 'decrypt' ? 'Decrypting...' : 'Decrypt my position'}
              </button>
              {decryptedPosition ? (
                <p className="muted small">You are at ({decryptedPosition.x}, {decryptedPosition.y})</p>
              ) : null}
            </div>
          </div>

          <div className="movement-card">
            <div>
              <p className="eyebrow">Encrypted movement</p>
              <h4>Pick a direction</h4>
              <p className="muted">Directions are encrypted with Zama before hitting the contract.</p>
            </div>
            <div className="direction-grid">
              <button
                className="direction"
                onClick={() => handleMove('up')}
                disabled={!joined || pendingAction !== null}
              >
                ↑ North
              </button>
              <button
                className="direction"
                onClick={() => handleMove('left')}
                disabled={!joined || pendingAction !== null}
              >
                ← West
              </button>
              <button
                className="direction"
                onClick={() => handleMove('right')}
                disabled={!joined || pendingAction !== null}
              >
                East →
              </button>
              <button
                className="direction"
                onClick={() => handleMove('down')}
                disabled={!joined || pendingAction !== null}
              >
                South ↓
              </button>
            </div>
            <div className="status-row">
              <div className="pill subtle">{joined ? 'Joined' : 'Not joined'}</div>
              <div className="pill subtle">{lastDirection ? `Last move: ${lastDirection}` : 'No moves yet'}</div>
              <div className="pill subtle">{loadingCopy || 'Idle'}</div>
            </div>
          </div>

          <div className="status-card">
            <p className="muted">{statusMessage}</p>
            {zamaError ? <p className="error">Relayer error: {zamaError}</p> : null}
            {!isConnected ? <p className="muted">Connect to Sepolia to interact.</p> : null}
          </div>
        </section>

        <section className="panel">
          <GameBoard position={decryptedPosition} joined={joined} />
          <div className="status-card muted">
            <p>Board sync: {fetchingPosition ? 'Fetching position...' : 'Up to date'}</p>
            <p>ACL-aware decryptions rely on the contract granting permissions each move.</p>
            <button className="text-button" onClick={resetAfterChainChange}>
              Clear decrypted position
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
