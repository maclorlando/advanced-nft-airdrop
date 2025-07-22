import { ethers } from "hardhat";
import { expect } from "chai";
import merkleData from "../../scripts/merkle-proof.json";

describe("AdvancedNFT – Full Suite", function () {
  const CLAIM_MODE = {
    MAPPING: 0,
    BITMAP: 1,
  };

  let user: any, owner: any;
  let userAddr: string;
  let index: number;
  let proof: string[];

  before(async () => {
    const signers = await ethers.getSigners();
    [owner, user] = signers;
    userAddr = user.address.toLowerCase();

    const entry = merkleData.proofs[userAddr];
    if (!entry) throw new Error(`No proof found for ${userAddr}`);
    index = entry.index;
    proof = entry.proof;
  });

  async function deployNFT(mode: number) {
    const AdvancedNFT = await ethers.getContractFactory("AdvancedNFT");
    const nft = await AdvancedNFT.deploy(
      "AirdropNFT",
      "ADN",
      merkleData.root,
      mode
    );
    await nft.waitForDeployment();
    return nft;
  }

  it("should commit and reveal a random NFT id during presale", async () => {
    const nft = await deployNFT(CLAIM_MODE.MAPPING);
    await nft.setMintState(1); // Presale

    const secret = "my-secret";

    await nft.connect(user).commit(index, proof, secret);

    const storedHash = await nft.getCommittedSecret(userAddr);
    const expectedHash = ethers.keccak256(
      ethers.solidityPacked(["address", "string"], [user.address, secret])
    );
    expect(storedHash).to.equal(expectedHash);

    await nft.connect(user).reveal(secret);

    expect(await nft.balanceOf(userAddr)).to.equal(1n);
    expect(await nft.hasClaimedMapping(userAddr)).to.equal(true);
  });

  it("should reject commit if not whitelisted", async () => {
    const nft = await deployNFT(CLAIM_MODE.MAPPING);
    await nft.setMintState(1); // Presale

    const secret = ethers.encodeBytes32String("bad-secret");

    const wrongProof: string[] = [];
    const wrongIndex = 9999;

    await expect(
      nft.connect(user).commit(wrongIndex, wrongProof, secret)
    ).to.be.revertedWith("Not whitelisted");
  });

  it("should mint with bitmap and record claim during presale", async () => {
    const nft = await deployNFT(CLAIM_MODE.BITMAP);
    await nft.setMintState(1); // Presale

    const secret = "another-secret";

    await nft.connect(user).commit(index, proof, secret);
    await nft.connect(user).reveal(secret);

    expect(await nft.balanceOf(userAddr)).to.equal(1n);
    expect(await nft.hasClaimedBitmap(index)).to.equal(true);
  });

  it("should mint in public sale by paying ETH fee", async () => {
    const nft = await deployNFT(CLAIM_MODE.MAPPING);
    await nft.setMintState(2); // Public

    const fee = await nft.publicMintFee();

    const tx = await nft.connect(user).publicMint({ value: fee });
    await tx.wait();

    expect(await nft.balanceOf(userAddr)).to.equal(1n);
  });

  it("should reject publicMint with insufficient ETH", async () => {
    const nft = await deployNFT(CLAIM_MODE.MAPPING);
    await nft.setMintState(2); // Public

    const fee = await nft.publicMintFee();

    await expect(
      nft.connect(user).publicMint({ value: fee - 1n })
    ).to.be.revertedWith("Insufficient ETH");
  });

  it("should restrict multicall to NFT transfers", async () => {
    const nft = await deployNFT(CLAIM_MODE.MAPPING);
    await nft.setMintState(2); // Public

    const fee = await nft.publicMintFee();

    const mintTx = await nft.connect(user).publicMint({ value: fee });
    await mintTx.wait();

    const tokenId = Number(await nft.tokenOfOwnerByIndex(user.address, 0));

    const iface = nft.interface;

    const transferData = iface.encodeFunctionData("transferFrom", [
      user.address,
      owner.address,
      tokenId,
    ]);

    const tx = await nft.connect(user).multicall([transferData]);
    await tx.wait();

    expect(await nft.ownerOf(tokenId)).to.equal(owner.address);

    const mintData = iface.encodeFunctionData("publicMint");

    await expect(
      nft.connect(user).multicall([mintData])
    ).to.be.revertedWith("Only transfer calls allowed");
  });

  it("should support pull pattern withdrawals", async () => {
    const nft = await deployNFT(CLAIM_MODE.MAPPING);

    const amount = ethers.parseEther("0.1");
    const preBal = await ethers.provider.getBalance(userAddr);

    const tx = await nft
      .connect(owner)
      .recordContribution(userAddr, { value: amount });
    await tx.wait();

    const withdrawTx = await nft.connect(user).withdraw();
    const receipt = await withdrawTx.wait();
    const gas = receipt.gasUsed * (receipt.gasPrice ?? 0n);

    const postBal = await ethers.provider.getBalance(userAddr);
    expect(postBal).to.be.closeTo(preBal + amount - gas, ethers.parseEther("0.001"));
  });

  it("should assign unique random token IDs", async () => {
    const nft = await deployNFT(CLAIM_MODE.MAPPING);
    await nft.setMintState(2); // Public

    const fee = await nft.publicMintFee();

    const mintedIds = new Set<number>();

    for (let i = 0; i < 5; i++) {
      const tx = await nft.connect(user).publicMint({ value: fee });
      await tx.wait();

      const id = Number(await nft.tokenOfOwnerByIndex(user.address, i));
      expect(mintedIds.has(id)).to.be.false;
      mintedIds.add(id);
    }

    expect(mintedIds.size).to.equal(5);
  });

  it("should reject multicall if `from` is address(0)", async () => {
    const nft = await deployNFT(CLAIM_MODE.MAPPING);
    await nft.setMintState(2); // Public

    const fee = await nft.publicMintFee();

    const mintTx = await nft.connect(user).publicMint({ value: fee });
    await mintTx.wait();

    const tokenId = Number(await nft.tokenOfOwnerByIndex(user.address, 0));

    const iface = nft.interface;

    const badTransferData = iface.encodeFunctionData("transferFrom", [
      ethers.ZeroAddress,
      owner.address,
      tokenId,
    ]);

    await expect(
      nft.connect(user).multicall([badTransferData])
    ).to.be.revertedWith("from cannot be zero");
  });
});
