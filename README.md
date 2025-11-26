# ShadowRep

Confidential on-chain reputation protocol built on Zama's fhEVM. Attestations and scores remain encrypted using Fully Homomorphic Encryption (FHE).

## Overview

Traditional on-chain reputation systems expose all data publicly, enabling gaming and manipulation. ShadowRep keeps reputation data encrypted while still allowing verification.

**Key Features:**
- Encrypted attestations (1-100 score range)
- Homomorphic score accumulation
- Threshold proofs without revealing exact scores
- Granular access control for third-party contracts

## How It Works

1. Users register to initialize an encrypted reputation profile
2. Peers give encrypted attestations (scores remain private)
3. Scores accumulate homomorphically on-chain
4. Protocols can verify minimum thresholds without accessing raw data

## Contract Functions

| Function | Description |
|----------|-------------|
| `register()` | Initialize encrypted reputation profile |
| `giveAttestation(to, encryptedScore, proof)` | Submit encrypted reputation score |
| `checkThreshold(user, threshold)` | Verify user meets minimum (returns encrypted bool) |
| `getMyScore()` | Retrieve own encrypted score |
| `grantAccess(address)` | Authorize contract to check reputation |

## Installation
```bash
git clone https://github.com/rudazy/shadowrep.git
cd shadowrep
npm install --legacy-peer-deps
```

## Commands
```bash
npx hardhat compile              # Compile contracts
npx hardhat test                 # Run tests
npx hardhat deploy --network sepolia  # Deploy to Sepolia
```

## Configuration

Set required variables before deploying:
```bash
npx hardhat vars set MNEMONIC
npx hardhat vars set INFURA_API_KEY
```

## Use Cases

- Undercollateralized DeFi lending
- Anonymous weighted DAO voting
- Private professional credentials
- Fair matchmaking systems

## Tech Stack

- Zama fhEVM
- Solidity 0.8.24
- Hardhat
- OpenZeppelin Contracts

## License

MIT

