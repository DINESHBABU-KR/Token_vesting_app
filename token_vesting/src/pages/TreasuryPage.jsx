import Icon from '../components/Icon'
import PageHeading from '../components/PageHeading'
import StatCard from '../components/StatCard'

function formatAmount(amount) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(amount)
}

function TreasuryPage({ totals, tokenBalance, tokenSymbol, vestingAddress }) {
  const committed = Math.max(0, totals.allocated - totals.released)
  const available = Math.max(0, tokenBalance - committed)

  return (
    <>
      <PageHeading
        eyebrow="ASSET MANAGEMENT"
        title="Treasury"
        description="Monitor token reserves held by the deployed vesting contract."
      />

      <section className="stats-grid treasury-stats">
        <StatCard label="Contract balance" value={`${formatAmount(tokenBalance)} ${tokenSymbol}`} note="ERC-20 balance on Sepolia" icon="wallet" tone="mint" />
        <StatCard label="Total allocated" value={`${formatAmount(totals.allocated)} ${tokenSymbol}`} note="Across vesting schedules" icon="calendar" tone="blue" />
        <StatCard label="Total released" value={`${formatAmount(totals.released)} ${tokenSymbol}`} note="Distributed to recipients" icon="arrowUpRight" tone="violet" />
        <StatCard label="Unallocated" value={`${formatAmount(available)} ${tokenSymbol}`} note="Balance minus locked tokens" icon="shield" tone="amber" />
      </section>

      <section className="treasury-grid">
        <article className="panel contract-panel">
          <div className="panel-heading">
            <div><h2>Vesting contract</h2><p>Sepolia deployment</p></div>
            <span className="contract-live"><i /> {vestingAddress ? 'Connected' : 'Not configured'}</span>
          </div>
          <div className="contract-detail">
            <span>Contract address</span>
            {vestingAddress
              ? <a href={`https://sepolia.etherscan.io/address/${vestingAddress}`} target="_blank" rel="noreferrer">{vestingAddress}</a>
              : <strong>Set VITE_TOKEN_VESTING_ADDRESS</strong>}
          </div>
          <div className="contract-detail"><span>Token standard</span><strong>ERC-20</strong></div>
          <div className="contract-detail"><span>Network</span><strong><i className="network-status" /> Sepolia testnet</strong></div>
          {vestingAddress && (
            <a className="contract-explorer" href={`https://sepolia.etherscan.io/address/${vestingAddress}`} target="_blank" rel="noreferrer">
              View on block explorer <Icon name="arrowUpRight" size={15} />
            </a>
          )}
        </article>
        <article className="panel reserve-panel">
          <div className="panel-heading">
            <div><h2>Reserve overview</h2><p>On-chain token allocation</p></div>
            <span className="release-icon"><Icon name="wallet" size={19} /></span>
          </div>
          <div className="reserve-legend">
            <div><i className="reserve-dot allocated-dot" /><span>Locked in schedules</span><strong>{formatAmount(committed)} {tokenSymbol}</strong></div>
            <div><i className="reserve-dot available-dot" /><span>Unallocated reserve</span><strong>{formatAmount(available)} {tokenSymbol}</strong></div>
            <small>Values are read from the ERC-20 contract and vesting schedules.</small>
          </div>
        </article>
      </section>

      <section className="panel table-panel activity-panel">
        <div className="panel-heading table-panel-heading">
          <div><h2>Recent activity</h2><p>Transaction history is not indexed by this client yet.</p></div>
        </div>
        <div className="empty-row">Confirmed token operations are available on the Sepolia block explorer.</div>
      </section>
    </>
  )
}

export default TreasuryPage
