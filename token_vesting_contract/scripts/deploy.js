import { network } from "hardhat";

async function main() {
  if (!process.env.SEPOLIA_RPC_URL || !process.env.PRIVATEKEY) {
    throw new Error("Set SEPOLIA_RPC_URL and PRIVATEKEY in token-vesting-contract/.env.");
  }

  const { ethers } = await network.create({ network: "sepolia" });
  const { chainId } = await ethers.provider.getNetwork();
  if (chainId !== 11155111n) {
    throw new Error(`Refusing to deploy: expected Sepolia (11155111), got chain ${chainId}.`);
  }

  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  if (balance === 0n) {
    throw new Error(`Deployer ${deployer.address} has no Sepolia ETH for gas.`);
  }

  console.log("Deploying to Sepolia with:", deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH");

  const MockERC20 = await ethers.getContractFactory("MockERC20", deployer);
  const token = await MockERC20.deploy(
    "NOVA Token",
    "NOVA",
    ethers.parseUnits("1000000", 18),
  );
  const tokenTransaction = token.deploymentTransaction();
  if (!tokenTransaction) throw new Error("Could not retrieve the token deployment transaction.");
  console.log("MockERC20 transaction:", tokenTransaction.hash);
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("MockERC20 address:", tokenAddress);

  const TokenVesting = await ethers.getContractFactory("TokenVesting", deployer);
  const vesting = await TokenVesting.deploy(tokenAddress, deployer.address);
  const vestingTransaction = vesting.deploymentTransaction();
  if (!vestingTransaction) throw new Error("Could not retrieve the vesting deployment transaction.");
  console.log("TokenVesting transaction:", vestingTransaction.hash);
  await vesting.waitForDeployment();
  const vestingAddress = await vesting.getAddress();

  console.log("TokenVesting address:", vestingAddress);
  console.log(`Set VITE_TOKEN_VESTING_ADDRESS=${vestingAddress} in the client environment.`);
  console.log(`Token explorer: https://sepolia.etherscan.io/address/${tokenAddress}`);
  console.log(`Vesting explorer: https://sepolia.etherscan.io/address/${vestingAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
