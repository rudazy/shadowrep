import { expect } from "chai";
import { ethers } from "hardhat";

describe("ShadowRep", function () {
  async function deployShadowRepFixture() {
    const [owner, user1, user2] = await ethers.getSigners();

    const ShadowRep = await ethers.getContractFactory("ShadowRep");
    const shadowRep = await ShadowRep.deploy();

    return { shadowRep, owner, user1, user2 };
  }

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      const { shadowRep } = await deployShadowRepFixture();
      expect(await shadowRep.totalUsers()).to.equal(0);
      expect(await shadowRep.totalAttestations()).to.equal(0);
    });

    it("Should set the right owner", async function () {
      const { shadowRep, owner } = await deployShadowRepFixture();
      expect(await shadowRep.owner()).to.equal(owner.address);
    });
  });

  describe("Registration", function () {
    it("Should allow user to register", async function () {
      const { shadowRep, user1 } = await deployShadowRepFixture();
      
      await shadowRep.connect(user1).register();
      
      expect(await shadowRep.isRegistered(user1.address)).to.equal(true);
      expect(await shadowRep.totalUsers()).to.equal(1);
    });

    it("Should not allow double registration", async function () {
      const { shadowRep, user1 } = await deployShadowRepFixture();
      
      await shadowRep.connect(user1).register();
      
      await expect(
        shadowRep.connect(user1).register()
      ).to.be.revertedWithCustomError(shadowRep, "AlreadyRegistered");
    });
  });

  describe("Profile", function () {
    it("Should return correct profile data", async function () {
      const { shadowRep, user1 } = await deployShadowRepFixture();
      
      await shadowRep.connect(user1).register();
      
      const [registered, lastActive] = await shadowRep.getProfile(user1.address);
      
      expect(registered).to.equal(true);
      expect(lastActive).to.be.gt(0);
    });

    it("Should return false for unregistered user", async function () {
      const { shadowRep, user1 } = await deployShadowRepFixture();
      
      const [registered] = await shadowRep.getProfile(user1.address);
      
      expect(registered).to.equal(false);
    });
  });

  describe("Access Control", function () {
    it("Should not allow unregistered user to grant access", async function () {
      const { shadowRep, user1, user2 } = await deployShadowRepFixture();
      
      await expect(
        shadowRep.connect(user1).grantAccess(user2.address)
      ).to.be.revertedWithCustomError(shadowRep, "NotRegistered");
    });
  });
});