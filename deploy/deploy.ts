import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  if (hre.network.name === "sepolia" && (!process.env.PRIVATE_KEY || process.env.PRIVATE_KEY.length === 0)) {
    throw new Error("PRIVATE_KEY env variable is required for sepolia deployments");
  }

  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedGame = await deploy("CryptoVeilGame", {
    from: deployer,
    log: true,
  });

  console.log(`CryptoVeilGame contract: `, deployedGame.address);
};
export default func;
func.id = "deploy_crypto_veil_game"; // id required to prevent reexecution
func.tags = ["CryptoVeilGame"];
