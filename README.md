# CryptoVeil

CryptoVeil is a fully encrypted on-chain grid game where every player position and movement stays private while still
being verifiable on Ethereum. Players join a 10x10 board, receive a random encrypted starting coordinate, and move
up/down/left/right using encrypted directions. Only the player can decrypt their position.

## Why CryptoVeil

Blockchains are transparent by default, which makes location-based gameplay or hidden-state mechanics hard to build
without leaking data. CryptoVeil solves this with Fully Homomorphic Encryption (FHE) so that game logic executes on
encrypted data while preserving correctness and privacy.

## Key Advantages

- **True on-chain privacy**: Positions and moves remain encrypted on-chain; no plaintext leaks.
- **Verifiable randomness**: Starting positions use Zama FHE randomness within the contract.
- **Deterministic boundaries**: Encrypted movement is clamped within a 1-10 grid.
- **Player-controlled visibility**: Players can decrypt only their own coordinates.
- **Simple, auditable core**: Minimal surface area makes the gameplay logic easy to verify.

## Problems Solved

- **Hidden state on public chains**: Keeps sensitive game data private without off-chain trust.
- **Fair movement without server authority**: All updates are validated in the smart contract.
- **Random spawning with privacy**: Randomness stays encrypted while producing bounded coordinates.

## How It Works

1. **Join**: A player calls `joinGame` and receives a random encrypted `(x, y)` within the 10x10 board.
2. **Decrypt**: The player requests decryption on the client to learn their own coordinates.
3. **Move**: The player sends an encrypted direction (0=up, 1=down, 2=left, 3=right).
4. **Update**: The contract updates the encrypted position while respecting the board edges.

## Tech Stack

- **Smart contracts**: Solidity + Hardhat
- **FHE**: Zama FHEVM
- **Frontend**: React + Vite
- **Wallet + UX**: RainbowKit
- **Read operations**: viem
- **Write operations**: ethers

## Project Structure

```
.
├── contracts/        # Solidity contracts
├── deploy/           # Deployment scripts
├── deployments/      # Deployment outputs and ABIs
├── tasks/            # Hardhat tasks
├── test/             # Tests
├── src/              # Frontend app (Vite)
└── docs/             # Zama-related references
```

## Smart Contract Overview

Contract: `contracts/CryptoVeilGame.sol`

- **joinGame()**: Assigns a random encrypted starting coordinate.
- **move(direction, proof)**: Applies encrypted movement and clamps within the board.
- **getPlayerPosition(player)**: Returns encrypted coordinates for a player address.
- **hasJoined(player)**: Checks join status.
- **boardLimits()**: Returns `(1, 10)` for UI boundaries.

## Local Development

### Prerequisites

- Node.js 20+
- npm

### Install

```bash
npm install
```

### Compile and Test

```bash
npm run compile
npm run test
```

### Local Node and Deployment

```bash
npx hardhat node
npx hardhat deploy --network localhost
```

## Sepolia Deployment

The Hardhat config expects environment values for Sepolia. Use a private key (no mnemonic).

- `INFURA_API_KEY`
- `PRIVATE_KEY`
- `ETHERSCAN_API_KEY` (optional)

Deploy:

```bash
npx hardhat deploy --network sepolia
```

Verify (optional):

```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

## Frontend Notes

- The frontend ABI must be copied from `deployments/sepolia` after deployment.
- Read calls use `viem`; write calls use `ethers`.
- The game does not rely on localhost networks or local storage.

## Security and Privacy Considerations

- Encrypted positions are stored on-chain; only the player is granted decryption access.
- Movement is normalized to four directions and bounded within the grid.
- No view function relies on `msg.sender` for address inputs.

## Future Roadmap

- **Multiplayer interactions**: Encrypted proximity checks, fog-of-war mechanics.
- **Objectives and rewards**: Encrypted quest items and location-based payouts.
- **Anti-collusion mechanics**: Rate limits and encrypted audit trails.
- **Map expansions**: Larger boards and dynamic zones.
- **UX improvements**: Faster relayer workflows and clearer encrypted state visuals.

## License

BSD-3-Clause-Clear. See `LICENSE`.
