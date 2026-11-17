import Icon from './Icon'

function formatAmount(amount) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  }).format(amount)
}

function ScheduleTable({ schedules, compact = false, onAction, tokenSymbol = 'TOKEN' }) {
  return (
    <div className="table-scroll">
      <table className="schedule-table">
        <thead>
          <tr>
            <th>RECIPIENT</th>
            <th>VESTING AMOUNT</th>
            {!compact && <th>RELEASED</th>}
            <th>PERIOD</th>
            <th>STATUS</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {schedules.map((schedule) => {
            const progress = Math.min(
              100,
              Math.round((schedule.released / schedule.amount) * 100),
            )
            return (
              <tr key={schedule.id}>
                <td>
                  <div className="recipient-cell">
                    <span className={`recipient-avatar ${schedule.color}`}>
                      {schedule.name
                        .split(' ')
                        .map((part) => part[0])
                        .join('')
                        .slice(0, 2)}
                    </span>
                    <span className="recipient-details">
                      <strong>{schedule.name}</strong>
                      <small>{schedule.address}</small>
                    </span>
                  </div>
                </td>
                <td>
                  <span className="amount-cell">{formatAmount(schedule.amount)} {tokenSymbol}</span>
                  {!compact && (
                    <span className="amount-subtext">
                      {progress}% released
                    </span>
                  )}
                </td>
                {!compact && (
                  <td>
                    <span className="amount-cell">
                      {formatAmount(schedule.released)} {tokenSymbol}
                    </span>
                  </td>
                )}
                <td>
                  <span className="period-cell">{schedule.start}</span>
                  <span className="period-subtext">to {schedule.end}</span>
                </td>
                <td>
                  <span className={`status-badge ${schedule.status.toLowerCase()}`}>
                    <span />
                    {schedule.status}
                  </span>
                </td>
                <td>
                  <button
                    className="table-action"
                    type="button"
                    aria-label={`Release claimable tokens for ${schedule.name}`}
                    title={schedule.claimable > 0 ? 'Release claimable tokens' : 'No tokens are currently claimable'}
                    disabled={!schedule.canRelease || schedule.claimable <= 0}
                    onClick={() => onAction?.(schedule)}
                  >
                    <Icon name="arrowUpRight" size={16} />
                  </button>
                </td>
              </tr>
            )
          })}
          {schedules.length === 0 && (
            <tr>
              <td className="empty-row" colSpan={compact ? 5 : 6}>
                No schedules match your filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default ScheduleTable
