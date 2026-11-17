import { useEffect, useMemo, useState } from 'react'
import { formatUnits, getAddress, isAddress, parseUnits } from 'viem'
import {
  useAccount,
  useConnect,
  useDisconnect,
  usePublicClient,
  useSwitchChain,
  useWalletClient,
} from 'wagmi'
import {
  erc20Abi,
  hasInvalidTokenAddress,
  hasInvalidVestingAddress,
  tokenAddress as configuredTokenAddress,
  vestingAbi,
  vestingAddress,
} from '../contract'
import { supportedChain, wagmiConfig } from '../wagmi'

const emptySchedules = []

function toDisplayDate(timestamp) {
  return new Date(Number(timestamp) * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function addMonths(dateValue, months) {
  const date = new Date(`${dateValue}T00:00:00Z`)
  const targetMonth = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth() + Number(months),
    1,
  ))
  const lastDay = new Date(Date.UTC(
    targetMonth.getUTCFullYear(),
    targetMonth.getUTCMonth() + 1,
    0,
  )).getUTCDate()
  targetMonth.setUTCDate(Math.min(date.getUTCDate(), lastDay))
  return targetMonth
}

export function useVestingContract() {
  const [schedules, setSchedules] = useState([])
  const [loadState, setLoadState] = useState({ key: '', error: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [tokenSymbol, setTokenSymbol] = useState('TOKEN')
  const [tokenBalance, setTokenBalance] = useState(0)
  const [tokenDecimals, setTokenDecimals] = useState(18)
  const [vestingTokenAddress, setVestingTokenAddress] = useState()
  const [ownerAddress, setOwnerAddress] = useState()
  const [refreshKey, setRefreshKey] = useState(0)

  const { address, chainId, isConnected, status } = useAccount()
  const { connectAsync, error: connectError, isPending: isConnecting } = useConnect()
  const { disconnectAsync } = useDisconnect()
  const { switchChainAsync } = useSwitchChain()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient({ chainId: supportedChain.id })
  const isCorrectNetwork = !isConnected || chainId === supportedChain.id
  const requestKey = `${vestingAddress || 'unconfigured'}:${configuredTokenAddress || 'token-unconfigured'}:${address || 'disconnected'}:${chainId || supportedChain.id}:${refreshKey}`
  const loadError = loadState.key === requestKey ? loadState.error : ''
  const isLoading = Boolean(
    vestingAddress
    && configuredTokenAddress
    && publicClient
    && isCorrectNetwork
    && loadState.key !== requestKey,
  )
  const isDataReady = loadState.key === requestKey && !loadError
  const isOwner = Boolean(
    address && ownerAddress && address.toLowerCase() === ownerAddress.toLowerCase(),
  )
  const canCreate = Boolean(
    isConnected
    && isCorrectNetwork
    && isDataReady
    && isOwner
    && vestingAddress
    && vestingTokenAddress,
  )
  const displayedSchedules = vestingAddress
    && configuredTokenAddress
    && isCorrectNetwork
    && !loadError
    && !isLoading
    ? schedules
    : emptySchedules
  const displayedTokenBalance = vestingAddress
    && configuredTokenAddress
    && isCorrectNetwork
    && !loadError
    && !isLoading
    ? tokenBalance
    : 0

  const totals = useMemo(
    () =>
      displayedSchedules.reduce(
        (result, schedule) => ({
          allocated: result.allocated + schedule.amount,
          released: result.released + schedule.released,
        }),
        { allocated: 0, released: 0 },
      ),
    [displayedSchedules],
  )

  useEffect(() => {
    if (!vestingAddress || !configuredTokenAddress || !publicClient || !isCorrectNetwork) {
      return undefined
    }

    let cancelled = false
    async function loadVestingData() {
      const [contractTokenAddress, owner, count] = await Promise.all([
        publicClient.readContract({
          address: vestingAddress,
          abi: vestingAbi,
          functionName: 'getToken',
        }),
        publicClient.readContract({
          address: vestingAddress,
          abi: vestingAbi,
          functionName: 'owner',
        }),
        publicClient.readContract({
          address: vestingAddress,
          abi: vestingAbi,
          functionName: 'getVestingSchedulesCount',
        }),
      ])
      const normalizedTokenAddress = getAddress(contractTokenAddress)
      if (normalizedTokenAddress.toLowerCase() !== configuredTokenAddress.toLowerCase()) {
        throw new Error('VITE_TOKEN_ADDRESS does not match the token configured in TokenVesting.')
      }

      const [decimals, symbol, balance] = await Promise.all([
        publicClient.readContract({
          address: normalizedTokenAddress,
          abi: erc20Abi,
          functionName: 'decimals',
        }),
        publicClient.readContract({
          address: normalizedTokenAddress,
          abi: erc20Abi,
          functionName: 'symbol',
        }),
        publicClient.readContract({
          address: normalizedTokenAddress,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [vestingAddress],
        }),
      ])
      const scheduleCount = Number(count)
      if (!Number.isSafeInteger(scheduleCount)) {
        throw new Error('The vesting contract returned an unsupported schedule count.')
      }

      const scheduleIds = await Promise.all(
        Array.from({ length: scheduleCount }, (_, index) =>
          publicClient.readContract({
            address: vestingAddress,
            abi: vestingAbi,
            functionName: 'getVestingIdAtIndex',
            args: [BigInt(index)],
          }),
        ),
      )
      const now = Math.floor(Date.now() / 1000)
      const loadedSchedules = await Promise.all(scheduleIds.map(async (scheduleId, index) => {
        const [details, claimable] = await Promise.all([
          publicClient.readContract({
            address: vestingAddress,
            abi: vestingAbi,
            functionName: 'getVestingSchedule',
            args: [scheduleId],
          }),
          publicClient.readContract({
            address: vestingAddress,
            abi: vestingAbi,
            functionName: 'computeReleasableAmount',
            args: [scheduleId],
          }),
        ])
        const beneficiary = details.beneficiary
        const start = Number(details.start)
        const end = start + Number(details.duration)
        const statusLabel = details.revoked || now >= end
          ? 'Completed'
          : now < start
            ? 'Upcoming'
            : 'Active'

        return {
          id: `VST-${String(index + 1).padStart(4, '0')}`,
          scheduleId,
          name: `Recipient ${beneficiary.slice(0, 6)}…${beneficiary.slice(-4)}`,
          address: beneficiary,
          amount: Number(formatUnits(details.amountTotal, decimals)),
          released: Number(formatUnits(details.released, decimals)),
          claimable: Number(formatUnits(claimable, decimals)),
          start: toDisplayDate(start),
          end: toDisplayDate(end),
          status: statusLabel,
          color: ['violet', 'blue', 'orange', 'rose', 'mint'][index % 5],
          canRelease: Boolean(
            address && (
              address.toLowerCase() === beneficiary.toLowerCase()
              || address.toLowerCase() === owner.toLowerCase()
            ),
          ),
        }
      }))

      if (!cancelled) {
        setSchedules(loadedSchedules)
        setTokenDecimals(decimals)
        setTokenSymbol(symbol)
        setTokenBalance(Number(formatUnits(balance, decimals)))
        setOwnerAddress(owner)
        setVestingTokenAddress(normalizedTokenAddress)
        setLoadState({ key: requestKey, error: '' })
      }
    }

    loadVestingData().catch((error) => {
      if (!cancelled) {
        setSchedules([])
        setLoadState({
          key: requestKey,
          error: error instanceof Error ? error.message : 'The blockchain read failed.',
        })
      }
    })

    return () => {
      cancelled = true
    }
  }, [address, chainId, isConnected, isCorrectNetwork, publicClient, requestKey])

  async function connectWallet() {
    if (isConnected && chainId !== supportedChain.id) {
      await switchChainAsync({ chainId: supportedChain.id })
    } else if (isConnected) {
      await disconnectAsync()
    } else {
      await connectAsync({ connector: wagmiConfig.connectors[0] })
    }
  }

  async function createSchedule(values, notify = () => {}) {
    if (!canCreate || !address || !walletClient || !publicClient || !vestingAddress || !vestingTokenAddress) {
      throw new Error('Connect the vesting contract owner wallet on Sepolia to create a schedule.')
    }
    if (!isAddress(values.address)) {
      throw new Error('Enter a valid recipient wallet address.')
    }

    const amount = parseUnits(values.amount, tokenDecimals)
    if (amount <= 0n) throw new Error('The token amount must be greater than zero.')
    const start = new Date(`${values.start}T00:00:00Z`)
    const end = addMonths(values.start, values.duration)
    const cliffEnd = addMonths(values.start, values.cliff)
    const startSeconds = BigInt(Math.floor(start.getTime() / 1000))
    const durationSeconds = BigInt(Math.floor((end.getTime() - start.getTime()) / 1000))
    const cliffSeconds = BigInt(Math.floor((cliffEnd.getTime() - start.getTime()) / 1000))
    if (cliffSeconds > durationSeconds) {
      throw new Error('The cliff cannot be longer than the vesting duration.')
    }

    setIsSubmitting(true)
    try {
      const allowance = await publicClient.readContract({
        address: vestingTokenAddress,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [address, vestingAddress],
      })
      if (allowance < amount) {
        notify('Approve the token transfer in your wallet.')
        const approvalHash = await walletClient.writeContract({
          address: vestingTokenAddress,
          abi: erc20Abi,
          functionName: 'approve',
          args: [vestingAddress, amount],
        })
        const approvalReceipt = await publicClient.waitForTransactionReceipt({ hash: approvalHash })
        if (approvalReceipt.status !== 'success') {
          throw new Error('The token approval transaction did not succeed.')
        }
      }

      notify('Confirm the vesting schedule transaction in your wallet.')
      const hash = await walletClient.writeContract({
        address: vestingAddress,
        abi: vestingAbi,
        functionName: 'createVestingSchedule',
        args: [
          getAddress(values.address),
          startSeconds,
          cliffSeconds,
          durationSeconds,
          1n,
          true,
          amount,
        ],
      })
      const receipt = await publicClient.waitForTransactionReceipt({ hash })
      if (receipt.status !== 'success') {
        throw new Error('The vesting schedule transaction did not succeed.')
      }
      setRefreshKey((current) => current + 1)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function releaseSchedule(schedule) {
    if (
      !isConnected
      || !isCorrectNetwork
      || !schedule.canRelease
      || schedule.claimable <= 0
      || !walletClient
      || !publicClient
      || !vestingAddress
      || !schedule.scheduleId
    ) {
      throw new Error('Connect the beneficiary or contract owner wallet on Sepolia to release claimable tokens.')
    }

    setIsSubmitting(true)
    try {
      const hash = await walletClient.writeContract({
        address: vestingAddress,
        abi: vestingAbi,
        functionName: 'releaseAll',
        args: [schedule.scheduleId],
      })
      const receipt = await publicClient.waitForTransactionReceipt({ hash })
      if (receipt.status !== 'success') {
        throw new Error('The token release transaction did not succeed.')
      }
      setRefreshKey((current) => current + 1)
    } finally {
      setIsSubmitting(false)
    }
  }

  function refresh() {
    setRefreshKey((current) => current + 1)
  }

  const contractNotice = hasInvalidVestingAddress
    ? 'VITE_TOKEN_VESTING_ADDRESS is not a valid Ethereum address.'
    : hasInvalidTokenAddress
      ? 'VITE_TOKEN_ADDRESS is not a valid Ethereum address.'
      : !vestingAddress
        ? 'Set VITE_TOKEN_VESTING_ADDRESS to the deployed vesting contract address to load on-chain data.'
        : !configuredTokenAddress
          ? 'Set VITE_TOKEN_ADDRESS to the deployed ERC-20 token address.'
          : !publicClient
            ? 'The Sepolia RPC client is not available.'
            : isConnected && !isCorrectNetwork
              ? 'Switch your wallet to Sepolia to use this vesting deployment.'
              : loadError
                ? `Unable to load vesting contract data: ${loadError}`
                : isLoading
                  ? 'Loading token and vesting schedule data from Sepolia…'
                  : isConnected && !isOwner
                    ? 'Connected in read-only mode. Only the contract owner can create schedules.'
                    : ''

  const walletLabel = isConnecting || status === 'connecting'
    ? 'Connecting…'
    : isConnected && address
      ? chainId !== supportedChain.id
        ? 'Switch to Sepolia'
        : `Disconnect ${address.slice(0, 6)}…${address.slice(-4)}`
      : connectError
        ? 'Retry wallet'
        : 'Connect wallet'

  return {
    address,
    isConnected,
    isCorrectNetwork,
    isLoading,
    isSubmitting,
    canCreate,
    schedules: displayedSchedules,
    totals,
    tokenSymbol,
    tokenBalance: displayedTokenBalance,
    vestingAddress,
    isOwner,
    loadError,
    contractNotice,
    walletLabel,
    connectWallet,
    createSchedule,
    releaseSchedule,
    refresh,
  }
}
