import { expect } from "chai";
import { ethers } from "hardhat";

describe("Ethernaut 14 - GatekeeperTwo", function () {
  it("should pass all gates", async () => {
    const [deployer, attacker] = await ethers.getSigners();

    // Deploy the GatekeeperTwo contract
    const Gatekeeper = await ethers.getContractFactory("GatekeeperTwo");
    const gatekeeper = await Gatekeeper.deploy();
    await gatekeeper.waitForDeployment();

    // Deploy our attacker contract to bypass gates in the constructor
    const Attacker = await ethers.getContractFactory("GatekeeperTwoAttacker");
    const attackerContract = await Attacker.connect(attacker).deploy(await gatekeeper.getAddress());

    // Verify that we became the entrant
    expect(await gatekeeper.entrant()).to.equal(attacker.address);
  });
});
