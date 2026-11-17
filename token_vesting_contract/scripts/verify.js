import hre from "hardhat";
import { verifyContract } from "@nomicfoundation/hardhat-verify/verify";

const tokenAddress = "0xc6E452157849c8D47eC7aA44ba366d8CA2a1Ab83";
const vestingAddress = "0x21B7b4BFEad5b64B4B6d13E3D39D9Ff2D47F545D";
const ownerAddress = "0x69C90BACC1625e8f40839b35a3E963ed0Ae443f8";

async function main() {
  if (!process.env.ETHERSCAN_API_KEY) {
    throw new Error("Set ETHERSCAN_API_KEY in token-vesting-contract/.env before verifying.");
  }

  await verifyContract(
    {
      address: tokenAddress,
      contract: "contracts/mocks/MockERC20.sol:MockERC20",
      constructorArgs: ["NOVA Token", "NOVA", 1_000_000n * 10n ** 18n],
      provider: "etherscan",
    },
    hre,
  );
  console.log("NOVA MockERC20 verification completed.");

  await verifyContract(
    {
      address: vestingAddress,
      contract: "contracts/TokenVesting.sol:TokenVesting",
      constructorArgs: [tokenAddress, ownerAddress],
      provider: "etherscan",
    },
    hre,
  );
  console.log("TokenVesting verification completed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
