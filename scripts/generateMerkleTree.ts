// @ts-nocheck
import { ethers } from "hardhat";
import keccak256 from "keccak256";
import { MerkleTree } from "merkletreejs";
import fs from "fs";
import path from "path";

async function main() {
  const signers = await ethers.getSigners();
  const addresses = signers.slice(0, 3).map((s) => s.address);

  const getLeaf = (index: number, account: string): Buffer => {
    return Buffer.from(
      ethers.solidityPackedKeccak256(["uint256", "address"], [index, account]).slice(2),
      "hex"
    );
  };

  const leaves = addresses.map((addr, i) => getLeaf(i, addr));
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });

  const root = tree.getHexRoot();
  console.log("Merkle Root:", root);

  const proofs: Record<string, { index: number; proof: string[] }> = {};

  addresses.forEach((addr, i) => {
    const proof = tree.getHexProof(getLeaf(i, addr));
    proofs[addr.toLowerCase()] = { index: i, proof };
  });

  fs.writeFileSync(
    path.join(__dirname, "merkle-proof.json"),
    JSON.stringify({ root, proofs }, null, 2)
  );

  console.log("✅ Merkle tree and proofs written to merkle-proof.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
