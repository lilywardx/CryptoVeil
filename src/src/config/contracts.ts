export const CONTRACT_ADDRESS = '0xA0f16dcF670B6c129F1bDa0BEBc015a9A1486250';

export const CONTRACT_ABI = [
  {
    "inputs": [],
    "name": "ZamaProtocolUnsupported",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "player",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "euint32",
        "name": "x",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "euint32",
        "name": "y",
        "type": "bytes32"
      }
    ],
    "name": "PlayerJoined",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "player",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "euint32",
        "name": "x",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "euint32",
        "name": "y",
        "type": "bytes32"
      }
    ],
    "name": "PlayerMoved",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "boardLimits",
    "outputs": [
      {
        "internalType": "uint32",
        "name": "minCoordinate",
        "type": "uint32"
      },
      {
        "internalType": "uint32",
        "name": "maxCoordinate",
        "type": "uint32"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "confidentialProtocolId",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "player",
        "type": "address"
      }
    ],
    "name": "getPlayerPosition",
    "outputs": [
      {
        "internalType": "euint32",
        "name": "",
        "type": "bytes32"
      },
      {
        "internalType": "euint32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "player",
        "type": "address"
      }
    ],
    "name": "hasJoined",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "joinGame",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "externalEuint32",
        "name": "directionInput",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "inputProof",
        "type": "bytes"
      }
    ],
    "name": "move",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
