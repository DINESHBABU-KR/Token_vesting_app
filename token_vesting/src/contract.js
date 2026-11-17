import { getAddress, isAddress } from 'viem'
import { abi as vestingAbi } from '../../../token-vesting-contract/artifacts/contracts/TokenVesting.sol/TokenVesting.json'
import { abi as erc20Abi } from '../../../token-vesting-contract/artifacts/contracts/mocks/MockERC20.sol/MockERC20.json'

export { erc20Abi, vestingAbi }

const configuredVestingAddress = import.meta.env.VITE_TOKEN_VESTING_ADDRESS
const configuredTokenAddress = import.meta.env.VITE_TOKEN_ADDRESS

export const vestingAddress = configuredVestingAddress && isAddress(configuredVestingAddress)
  ? getAddress(configuredVestingAddress)
  : undefined

export const tokenAddress = configuredTokenAddress && isAddress(configuredTokenAddress)
  ? getAddress(configuredTokenAddress)
  : undefined

export const hasInvalidVestingAddress = Boolean(
  configuredVestingAddress && !vestingAddress,
)

export const hasInvalidTokenAddress = Boolean(
  configuredTokenAddress && !tokenAddress,
)
