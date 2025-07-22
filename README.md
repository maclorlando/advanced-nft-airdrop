# 🧬 Advanced NFT Airdrop & Minting Contract

This project demonstrates advanced smart contract design for NFT airdrops & minting phases, combining:
- Efficient Merkle tree-based whitelist verification
- Commit–reveal random NFT assignment
- State machine-controlled minting phases
- Secure ETH handling & multicall batching
- Benchmark of bitmap vs mapping for claim tracking

---

## 📋 Features

### 📦 Merkle-Based Airdrop (Presale Phase)
During the **Presale**, whitelisted users (verified via Merkle proof) can mint exactly one NFT by committing a secret and later revealing it.  

Two claim tracking methods are benchmarked:
- **Mapping**: mapping(address => bool)
- **Bitmap**: BitMaps.BitMap with Merkle index

### 🔐 State Machine
Minting phases:
- Closed: No minting
- Presale: Merkle-based commit–reveal whitelist minting
- Public: Anyone can mint by paying ETH
- SoldOut: Minting disabled when supply runs out

All minting functions use onlyState(MintState.X) to enforce proper phase rules.

### 🎲 Commit–Reveal Randomness
To ensure fair random NFT assignment:
- Users submit a commitment during Presale
- Later reveal the secret to mint the NFT assigned randomly

### 💰 Secure ETH Handling
All ETH collected during public sale is securely transferred to the owner, with appropriate checks to prevent reentrancy.

### 🔗 Multicall Support
Supports batching of multiple calls in a single transaction.

---

## 🔷 Security Challenges

In addition to the advanced NFT contract, this repository also contains solutions and demonstrations for **smart contract security challenges**, showcasing vulnerabilities and exploitation techniques.

### 🕵️ Address Hacks Demo
Demonstrates how improperly handled delegatecall or storage collisions can be exploited to gain control or drain funds.

### 🏰 Gatekeeper Two
Solution for the Ethernaut Gatekeeper Two challenge:
- Passes all three gatekeeper checks using carefully crafted inputs and contract behavior.

### 🏦 Truster Lender Pool
Solution for the Ethernaut Truster challenge:
- Uses the flash loan feature to approve itself and drain all tokens from the pool.

Each of these is implemented in its own contract and verified through tests.

---

## 🔧 Tools & Technologies

- Solidity (OpenZeppelin ERC721 & BitMaps)
- Hardhat
- Ethers.js
- Merkle Trees
- TypeScript (scripts)

---

## 🛠️ Running Locally & Running Tests

### Install dependencies
npm install --legacy-peer-deps

### Compile contracts
npx hardhat compile

### Run tests
npx hardhat test

---

## 📜 License

MIT
