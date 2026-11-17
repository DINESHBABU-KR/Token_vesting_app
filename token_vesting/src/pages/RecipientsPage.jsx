import { useMemo } from 'react'
import Icon from '../components/Icon'
import PageHeading from '../components/PageHeading'

function RecipientsPage({ schedules, onCreate, onNotify, tokenSymbol }) {
  const recipients = useMemo(() => {
    const groups = new Map()
    schedules.forEach((schedule) => {
      const current = groups.get(schedule.address) ?? {
        name: schedule.name,
        address: schedule.address,
        amount: 0,
        released: 0,
        schedules: 0,
        color: schedule.color,
      }
      current.amount += schedule.amount
      current.released += schedule.released
      current.schedules += 1
      groups.set(schedule.address, current)
    })
    return [...groups.values()]
  }, [schedules])

  return (
    <>
      <PageHeading
        eyebrow="PEOPLE & ALLOCATIONS"
        title="Recipients"
        description="See every beneficiary and the tokens allocated to them."
      >
        <button className="button-secondary" type="button" onClick={() => onNotify('Recipient list export is ready.')}>
          <Icon name="download" size={17} /> Export list
        </button>
        <button className="button-primary" type="button" onClick={onCreate}>
          <Icon name="plus" size={18} /> Add recipient
        </button>
      </PageHeading>

      <div className="recipients-summary">
        <div className="recipients-summary-icon"><Icon name="users" size={20} /></div>
        <div><strong>{recipients.length} recipients</strong><span>have received a {tokenSymbol} token allocation</span></div>
        <div className="summary-separator" />
        <div className="recipient-summary-total"><small>Total allocated</small><strong>{recipients.reduce((sum, item) => sum + item.amount, 0).toLocaleString()} <span>{tokenSymbol}</span></strong></div>
      </div>

      <div className="recipient-grid">
        {recipients.map((recipient) => {
          const progress = Math.round((recipient.released / recipient.amount) * 100)
          return (
            <article className="panel recipient-card" key={recipient.address}>
              <div className="recipient-card-top">
                <span className={`recipient-avatar large ${recipient.color}`}>
                  {recipient.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}
                </span>
                <button className="table-action" type="button" aria-label={`More options for ${recipient.name}`} onClick={() => onNotify(`Recipient wallet: ${recipient.address}`)}>
                  <Icon name="more" size={18} />
                </button>
              </div>
              <h2>{recipient.name}</h2>
              <button className="address-button" type="button" onClick={() => onNotify(`Wallet address: ${recipient.address}`)}>
                {recipient.address} <Icon name="external" size={14} />
              </button>
              <div className="recipient-card-divider" />
              <div className="recipient-card-stats">
                <div><small>Allocated</small><strong>{recipient.amount.toLocaleString()} <span>{tokenSymbol}</span></strong></div>
                <div><small>Schedules</small><strong>{recipient.schedules}</strong></div>
              </div>
              <div className="recipient-progress-head"><span>Vesting progress</span><strong>{progress}%</strong></div>
              <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
              <div className="recipient-card-bottom">
                <span>{recipient.released.toLocaleString()} {tokenSymbol} released</span>
                <span>{(recipient.amount - recipient.released).toLocaleString()} locked</span>
              </div>
            </article>
          )
        })}
      </div>
    </>
  )
}

export default RecipientsPage
