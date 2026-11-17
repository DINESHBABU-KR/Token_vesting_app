import Icon from './Icon'

function StatCard({ label, value, note, change, icon, tone = 'mint' }) {
  return (
    <article className="stat-card">
      <div className="stat-card-top">
        <span>{label}</span>
        <span className={`stat-icon ${tone}`}>
          <Icon name={icon} size={18} />
        </span>
      </div>
      <strong className="stat-value">{value}</strong>
      <div className="stat-foot">
        {change && <span className="stat-change">{change}</span>}
        <span>{note}</span>
      </div>
    </article>
  )
}

export default StatCard
