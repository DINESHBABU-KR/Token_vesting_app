# Token Vesting Contracts

Hardhat 3 project using Solidity 0.8.34, ethers, and OpenZeppelin contracts.

## Tests

```shell
npx hardhat test
```

Run Solidity or Mocha tests separately:

```shell
npx hardhat test solidity
npx hardhat test mocha
```

## Deploy to Sepolia

The deployment script deploys the included test ERC-20 token and then TokenVesting. The deployer becomes the vesting contract owner.

Create `token-vesting-contract/.env` (do not commit it) with:

```env
SEPOLIA_RPC_URL=https://your-sepolia-rpc
PRIVATEKEY=your-deployer-private-key
ETHERSCAN_API_KEY=your-etherscan-api-key
```

Fund the deployer with Sepolia ETH, then run:

```shell
npx hardhat run scripts/deploy.js
```

The script verifies the Sepolia chain ID before sending transactions, deploys 1,000,000 NOVA tokens to the deployer, and prints both contract addresses and Sepolia Etherscan links. Keep the private key local; never share or commit it.

## Verify the Sepolia contracts

Get an API key from [Etherscan](https://etherscan.io/myapikey) and set `ETHERSCAN_API_KEY` in the same local `.env`. Then run the verification script:

```shell
npx hardhat run --network sepolia --build-profile default scripts/verify.js
```

The script submits the exact constructor arguments used for the NOVA token and TokenVesting deployments. The `default` build profile is important because it matches the profile used for deployment. Successful verification publishes the Solidity source on each Etherscan contract page.
