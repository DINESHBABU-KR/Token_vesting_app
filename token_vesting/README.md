# Token Vesting client

The client uses wagmi and viem to connect an injected wallet and interact with the TokenVesting and ERC-20 contracts on Sepolia.

## Configure a deployment

1. Deploy the token and TokenVesting contracts to Sepolia. The connected wallet must be the TokenVesting owner to create schedules.
2. Create `.env.local` in this directory and set both deployed addresses:

   ```env
   VITE_TOKEN_VESTING_ADDRESS=0x21B7b4BFEad5b64B4B6d13E3D39D9Ff2D47F545D
   VITE_TOKEN_ADDRESS=0xc6E452157849c8D47eC7aA44ba366d8CA2a1Ab83
   ```

3. Optionally set `VITE_SEPOLIA_RPC_URL` to a Sepolia JSON-RPC endpoint. When omitted, wagmi uses the chain's default RPC endpoint.
4. Install dependencies and start the client:

   ```sh
   npm install
   npm run dev
   ```

The client imports the compiled ABI from the Hardhat artifacts and checks that `VITE_TOKEN_ADDRESS` matches the address returned by the configured vesting contract. It reads the token, owner, treasury balance, and vesting schedules on-chain. Creating a schedule submits an ERC-20 approval when needed, followed by `createVestingSchedule`. Eligible beneficiaries and the owner can release currently claimable tokens.
