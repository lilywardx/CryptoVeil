import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

const DIRECTION_MAP: Record<string, number> = {
  up: 0,
  down: 1,
  left: 2,
  right: 3,
};

task("game:address", "Prints the CryptoVeilGame address").setAction(async function (_taskArguments: TaskArguments, hre) {
  const { deployments } = hre;
  const deployment = await deployments.get("CryptoVeilGame");
  console.log("CryptoVeilGame address is " + deployment.address);
});

task("game:join", "Joins the CryptoVeil grid game")
  .addOptionalParam("contract", "Optionally specify the CryptoVeilGame contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;
    const signer = (await ethers.getSigners())[0];
    const deployment = taskArguments.contract
      ? { address: taskArguments.contract as string }
      : await deployments.get("CryptoVeilGame");

    const contract = await ethers.getContractAt("CryptoVeilGame", deployment.address);
    const tx = await contract.connect(signer).joinGame();
    console.log(`Joining game from ${signer.address}... tx:${tx.hash}`);
    await tx.wait();
    console.log("Join confirmed.");
  });

task("game:move", "Moves the player with an encrypted direction (up, down, left, right)")
  .addParam("direction", "Direction keyword")
  .addOptionalParam("contract", "Optionally specify the CryptoVeilGame contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;
    await fhevm.initializeCLIApi();

    const directionKey = (taskArguments.direction as string).toLowerCase();
    const directionValue = DIRECTION_MAP[directionKey];
    if (directionValue === undefined) {
      throw new Error(`Unknown direction '${taskArguments.direction}', expected up|down|left|right`);
    }

    const signer = (await ethers.getSigners())[0];
    const deployment = taskArguments.contract
      ? { address: taskArguments.contract as string }
      : await deployments.get("CryptoVeilGame");

    const encryptedDirection = await fhevm
      .createEncryptedInput(deployment.address, signer.address)
      .add32(directionValue)
      .encrypt();

    const contract = await ethers.getContractAt("CryptoVeilGame", deployment.address);
    const tx = await contract
      .connect(signer)
      .move(encryptedDirection.handles[0], encryptedDirection.inputProof);

    console.log(
      `Moving ${directionKey} from ${signer.address}... handle=${ethers.hexlify(encryptedDirection.handles[0])} tx:${
        tx.hash
      }`,
    );
    await tx.wait();
    console.log("Move confirmed.");
  });

task("game:position", "Decrypts a player's encrypted position")
  .addOptionalParam("player", "Player address (defaults to first signer)")
  .addOptionalParam("contract", "Optionally specify the CryptoVeilGame contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;
    await fhevm.initializeCLIApi();

    const signer = (await ethers.getSigners())[0];
    const player = (taskArguments.player as string | undefined) ?? signer.address;
    const deployment = taskArguments.contract
      ? { address: taskArguments.contract as string }
      : await deployments.get("CryptoVeilGame");

    const contract = await ethers.getContractAt("CryptoVeilGame", deployment.address);
    const joined = await contract.hasJoined(player);
    if (!joined) {
      throw new Error(`Player ${player} has not joined yet`);
    }

    const [encryptedX, encryptedY] = await contract.getPlayerPosition(player);

    const clearX = await fhevm.userDecryptEuint(FhevmType.euint32, encryptedX, deployment.address, signer);
    const clearY = await fhevm.userDecryptEuint(FhevmType.euint32, encryptedY, deployment.address, signer);

    console.log(`Player ${player} -> x=${clearX} y=${clearY}`);
  });
