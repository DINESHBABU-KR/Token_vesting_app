import Icon from '../components/Icon'
import PageHeading from '../components/PageHeading'
import ScheduleTable from '../components/ScheduleTable'
import StatCard from '../components/StatCard'

function formatAmount(amount) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(amount)
}

function DashboardPage({
  schedules,
  totals,
  onCreate,
  onViewSchedules,
  onNotify,
  onRelease,
  tokenSymbol,
}) {
  const activeCount = schedules.filter((schedule) => schedule.status === 'Active').length
  const locked = Math.max(0, totals.allocated - totals.released)
  const recipients = new Set(schedules.map((schedule) => schedule.address)).size

  return (
    <>
      <PageHeading
        eyebrow="SEPOLIA VESTING CONTRACT"
        title="On-chain overview"
        description="Live token vesting data read directly from the connected contract."
      >
        <button className="button-secondary export-button" type="button" onClick={() => onNotify('Report export is not connected yet.')}>
          <Icon name="download" size={17} /> Export report
        </button>
        <button className="button-primary" type="button" onClick={onCreate}>
          <Icon name="plus" size={18} /> New schedule
        </button>
      </PageHeading>

      <div className="demo-banner">
        <span className="demo-banner-icon"><Icon name="shield" size={17} /></span>
        <span><strong>Live contract data</strong> — schedule totals and recipients are read from Sepolia.</span>
      </div>

      <section className="stats-grid" aria-label="Vesting statistics">
        <StatCard
          label="Total allocated"
          value={`${formatAmount(totals.allocated)} ${tokenSymbol}`}
          note="Across vesting schedules"
          icon="wallet"
          tone="mint"
        />
        <StatCard
          label="Tokens released"
          value={`${formatAmount(totals.released)} ${tokenSymbol}`}
          note="Claimed by recipients"
          icon="arrowUpRight"
          tone="blue"
        />
        <StatCard
          label="Still vesting"
          value={`${formatAmount(locked)} ${tokenSymbol}`}
          note="Unreleased allocations"
          icon="clock"
          tone="amber"
        />
        <StatCard
          label="Active schedules"
          value={String(activeCount).padStart(2, '0')}
          note={`${recipients} total recipients`}
          icon="calendar"
          tone="violet"
        />
      </section>

      <section className="panel table-panel">
        <div className="panel-heading table-panel-heading">
          <div>
            <h2>Vesting schedules</h2>
            <p>Latest schedules indexed by the deployed vesting contract</p>
          </div>
          <button className="text-button" type="button" onClick={onViewSchedules}>
            View all schedules <Icon name="arrowRight" size={16} />
          </button>
        </div>
        <ScheduleTable
          schedules={schedules.slice(0, 4)}
          compact
          tokenSymbol={tokenSymbol}
          onAction={onRelease}
        />
      </section>
    </>
  )
}

export default DashboardPage
