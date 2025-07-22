import { ethers } from "hardhat";
import { expect } from "chai";

describe("Address Hacks", function () {
  it("should emit false from Address.isContract during constructor", async () => {
    const Victim = await ethers.getContractFactory("Victim");
    const victim = await Victim.deploy();
    await victim.waitForDeployment();

    const Bypasser = await ethers.getContractFactory("ExtcodesizeBypasser");
    await Bypasser.deploy(await victim.getAddress());

    const logs = await victim.queryFilter(victim.filters.CallerCheck());
    expect(logs[0].args.isContract).to.equal(false); // Expected behavior
  });

  it("should revert contract call due to tx.origin check", async () => {
    const Victim = await ethers.getContractFactory("Victim");
    const victim = await Victim.deploy();
    await victim.waitForDeployment();

    const Attacker = await ethers.getContractFactory("TxOriginAttacker");

    await expect(
      Attacker.deploy(await victim.getAddress())
    ).to.be.revertedWith("Contracts not allowed");
  });
});
