import { useMemo, useState } from 'react'
import Icon from '../components/Icon'
import PageHeading from '../components/PageHeading'
import ScheduleTable from '../components/ScheduleTable'
import StatCard from '../components/StatCard'

function SchedulesPage({
  schedules,
  totals,
  tokenSymbol,
  onCreate,
  initialQuery,
  onQueryChange,
  onRelease,
  isLoading,
}) {
  const [query, setQuery] = useState(initialQuery)
  const [status, setStatus] = useState('All schedules')

  function updateQuery(value) {
    setQuery(value)
    onQueryChange(value)
  }

  const filteredSchedules = useMemo(
    () =>
      schedules.filter((schedule) => {
        const matchesQuery = `${schedule.name} ${schedule.address} ${schedule.id}`
          .toLowerCase()
          .includes(query.toLowerCase())
        const matchesStatus = status === 'All schedules' || schedule.status === status
        return matchesQuery && matchesStatus
      }),
    [schedules, query, status],
  )

  return (
    <>
      <PageHeading
        eyebrow="TOKEN MANAGEMENT"
        title="Vesting schedules"
        description="Create, track, and manage token allocations for your team."
      >
        <button className="button-primary" type="button" onClick={onCreate}>
          <Icon name="plus" size={18} /> Create schedule
        </button>
      </PageHeading>

      <section className="stats-grid schedule-stats">
        <StatCard label="Total schedules" value={String(schedules.length).padStart(2, '0')} note="All-time created" icon="calendar" tone="mint" />
        <StatCard label="Tokens allocated" value={`${totals.allocated.toLocaleString()} ${tokenSymbol}`} note="Across all schedules" icon="wallet" tone="blue" />
        <StatCard label="Tokens distributed" value={`${totals.released.toLocaleString()} ${tokenSymbol}`} note="Successfully released" icon="arrowUpRight" tone="violet" />
        <StatCard label="Needs attention" value="00" note="No issues detected" icon="shield" tone="amber" />
      </section>

      <section className="panel schedules-panel">
        <div className="list-toolbar">
          <div>
            <h2>All schedules <span className="count-pill">{filteredSchedules.length}</span></h2>
            <p>Manage vesting schedules and recipient allocations.</p>
          </div>
          <div className="list-controls">
            <label className="table-search">
              <Icon name="search" size={17} />
              <input
                type="search"
                placeholder="Search recipients..."
                value={query}
                onChange={(event) => updateQuery(event.target.value)}
                aria-label="Search schedules"
              />
            </label>
            <label className="filter-select">
              <span className="sr-only">Filter by status</span>
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                <option>All schedules</option>
                <option>Active</option>
                <option>Upcoming</option>
                <option>Completed</option>
              </select>
              <Icon name="chevronDown" size={15} />
            </label>
          </div>
        </div>
        <ScheduleTable
          schedules={filteredSchedules}
          tokenSymbol={tokenSymbol}
          onAction={onRelease}
        />
        <div className="list-footer">
          <span>{isLoading ? 'Loading schedules…' : `Showing ${filteredSchedules.length} of ${schedules.length} schedules`}</span>
          <div className="pagination">
            <button type="button" disabled aria-label="Previous page">‹</button>
            <button className="current-page" type="button">1</button>
            <button type="button" disabled aria-label="Next page">›</button>
          </div>
        </div>
      </section>
    </>
  )
}

export default SchedulesPage
