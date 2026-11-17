# VestFlow — Token Vesting

A wallet-connected token vesting dashboard backed by an ERC-20 vesting contract. The frontend reads schedules and treasury data from Sepolia and supports owner-created schedules and token releases.

> **Testnet portfolio project:** This repository is configured for Sepolia and uses a mock NOVA token. The mock token includes an unrestricted `mint` function and is not suitable for real assets or mainnet use.

## Features

- Connect an injected wallet and switch to Sepolia.
- Read on-chain vesting schedules, token balances, recipients, and release amounts.
- Create schedules as the vesting contract owner, including ERC-20 approval.
- Release claimable tokens as a schedule beneficiary or the contract owner.
- Verify the configured token address against the token address returned by the vesting contract.

## Sepolia deployments

| Contract | Address |
| --- | --- |
| TokenVesting | [`0x21B7b4BFEad5b64B4B6d13E3D39D9Ff2D47F545D`](https://sepolia.etherscan.io/address/0x21B7b4BFEad5b64B4B6d13E3D39D9Ff2D47F545D) |
| NOVA mock ERC-20 | [`0xc6E452157849c8D47eC7aA44ba366d8CA2a1Ab83`](https://sepolia.etherscan.io/address/0xc6E452157849c8D47eC7aA44ba366d8CA2a1Ab83) |

The deployer is the vesting contract owner; only the owner can create schedules. See [`token-vesting-contract/README.md`](./token-vesting-contract/README.md) for deployment and verification instructions.

## Tech stack

- React, Vite
- wagmi, viem, TanStack Query
- Solidity 0.8.34, Hardhat 3, ethers 6
- OpenZeppelin Contracts

## Run locally

Install and run the frontend:

```sh
cd client/token_vesting
npm ci
npm run dev
```

The frontend reads its deployment configuration from `client/token_vesting/.env.local`:

```env
VITE_TOKEN_VESTING_ADDRESS=0x21B7b4BFEad5b64B4B6d13E3D39D9Ff2D47F545D
VITE_TOKEN_ADDRESS=0xc6E452157849c8D47eC7aA44ba366d8CA2a1Ab83
```

`VITE_SEPOLIA_RPC_URL` is optional. If set, it must be a Sepolia JSON-RPC endpoint. Vite-exposed variables are public in the browser bundle: **never put private keys or other secrets in `VITE_*` variables**.

The client uses the ABI JSON files in `client/token_vesting/src/abi`, so its Vercel build is self-contained. Hardhat artifacts are generated locally and ignored. If the Solidity contract changes, compile it and refresh the frontend ABI files before building:

```sh
cd token-vesting-contract
npx hardhat compile
# Copy the updated `abi` arrays from artifacts/contracts into client/token_vesting/src/abi.
```

## Deploy to Vercel

1. Import this Git repository into Vercel.
2. Set **Root Directory** to `client/token_vesting`.
3. Use the Vite defaults, or set the build command to `npm run build` and output directory to `dist`.
4. Add these Project Environment Variables for Production (and Preview if desired):

   ```text
   VITE_TOKEN_VESTING_ADDRESS=0x21B7b4BFEad5b64B4B6d13E3D39D9Ff2D47F545D
   VITE_TOKEN_ADDRESS=0xc6E452157849c8D47eC7aA44ba366d8CA2a1Ab83
   ```

5. Deploy or redeploy. The app expects the connected wallet to be on Sepolia; schedule creation additionally requires the vesting contract owner wallet.

## Contract development

```sh
cd token-vesting-contract
npm ci
npx hardhat test
```

The deployment script deploys the test NOVA token and vesting contract to Sepolia. It reads `SEPOLIA_RPC_URL` and `PRIVATEKEY` from a local `.env`; verification also requires `ETHERSCAN_API_KEY`. Keep these values private and do not commit `.env`.

## Project layout

```text
client/token_vesting/      React/Vite dApp
token-vesting-contract/    Solidity contracts, tests, and Hardhat scripts
```
