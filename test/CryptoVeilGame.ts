import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { CryptoVeilGame, CryptoVeilGame__factory } from "../types";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("CryptoVeilGame")) as CryptoVeilGame__factory;
  const gameContract = (await factory.deploy()) as CryptoVeilGame;
  const gameContractAddress = await gameContract.getAddress();

  return { gameContract, gameContractAddress };
}

async function encryptDirection(
  direction: number,
  contractAddress: string,
  player: HardhatEthersSigner,
): Promise<{ handle: string; proof: string }> {
  const encrypted = await fhevm.createEncryptedInput(contractAddress, player.address).add32(direction).encrypt();
  return { handle: encrypted.handles[0], proof: encrypted.inputProof };
}

async function decryptPosition(
  contract: CryptoVeilGame,
  contractAddress: string,
  signer: HardhatEthersSigner,
  target?: string,
) {
  const player = target ?? signer.address;
  const [encryptedX, encryptedY] = await contract.getPlayerPosition(player);

  const clearX = await fhevm.userDecryptEuint(FhevmType.euint32, encryptedX, contractAddress, signer);
  const clearY = await fhevm.userDecryptEuint(FhevmType.euint32, encryptedY, contractAddress, signer);

  return { x: Number(clearX), y: Number(clearY) };
}

describe("CryptoVeilGame", function () {
  let signers: Signers;
  let gameContract: CryptoVeilGame;
  let gameContractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ gameContract, gameContractAddress } = await deployFixture());
  });

  it("assigns a random starting position and lets the player decrypt it", async function () {
    const { alice } = signers;
    await gameContract.connect(alice).joinGame();

    const joined = await gameContract.hasJoined(alice.address);
    expect(joined).to.eq(true);

    const { x, y } = await decryptPosition(gameContract, gameContractAddress, alice, alice.address);
    expect(x).to.be.gte(1);
    expect(x).to.be.lte(10);
    expect(y).to.be.gte(1);
    expect(y).to.be.lte(10);
  });

  it("moves vertically with encrypted directions and clamps at the edge", async function () {
    const { alice } = signers;
    await gameContract.connect(alice).joinGame();

    const before = await decryptPosition(gameContract, gameContractAddress, alice, alice.address);
    const upInput = await encryptDirection(0, gameContractAddress, alice);

    await gameContract.connect(alice).move(upInput.handle, upInput.proof);

    const after = await decryptPosition(gameContract, gameContractAddress, alice, alice.address);
    const expectedY = Math.min(10, before.y + 1);

    expect(after.x).to.eq(before.x);
    expect(after.y).to.eq(expectedY);
  });

  it("never leaves the 10x10 board even after many moves", async function () {
    const { alice } = signers;
    await gameContract.connect(alice).joinGame();

    const moveLeft = await encryptDirection(2, gameContractAddress, alice);
    for (let i = 0; i < 15; i++) {
      await gameContract.connect(alice).move(moveLeft.handle, moveLeft.proof);
    }

    const moveUp = await encryptDirection(0, gameContractAddress, alice);
    for (let i = 0; i < 15; i++) {
      await gameContract.connect(alice).move(moveUp.handle, moveUp.proof);
    }

    const { x, y } = await decryptPosition(gameContract, gameContractAddress, alice, alice.address);
    expect(x).to.eq(1);
    expect(y).to.eq(10);
  });
});
