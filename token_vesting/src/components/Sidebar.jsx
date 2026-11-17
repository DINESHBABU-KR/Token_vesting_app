import Icon from './Icon'
import { useVestingContract } from '../hooks/useVestingContract'

const navigation = [
  { id: 'overview', label: 'Overview', icon: 'overview' },
  { id: 'schedules', label: 'Vesting schedules', icon: 'calendar' },
  { id: 'recipients', label: 'Recipients', icon: 'users' },
  { id: 'treasury', label: 'Treasury', icon: 'wallet' },
]

function Sidebar({ activePage, onNavigate, onCreate, onSettings }) {
  const { address , } = useVestingContract();
  return (
    <aside className="sidebar">
      <a className="brand" href="#" onClick={(event) => event.preventDefault()}>
        <span className="brand-mark">
          <span />
          <span />
          <span />
        </span>
        <span className="brand-name">vest<span>flow</span></span>
      </a>

      <span className="nav-label">WORKSPACE</span>
      <nav className="side-nav" aria-label="Main navigation">
        {navigation.map((item) => (
          <button
            className={`nav-item ${activePage === item.id ? 'is-active' : ''}`}
            key={item.id}
            onClick={() => onNavigate(item.id)}
            type="button"
          >
            <Icon name={item.icon} size={19} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <button className="sidebar-create" onClick={onCreate} type="button">
        <Icon name="plus" size={18} />
        <span>New schedule</span>
      </button>

      <div className="sidebar-bottom">
        <div className="network-card">
          <span className="network-status" />
          <div>
            <span className="eyebrow">NETWORK</span>
            <strong>Sepolia testnet</strong>
          </div>
          <Icon name="chevronDown" size={15} />
        </div>
        <div className="sidebar-profile">
          <div className="profile-avatar">JD</div>
          <div className="profile-copy">
            <strong>{address?.slice(0, 6)}...{address?.slice(-4)}</strong>
            <span>{address === import.meta.env.VITE_ADMIN_ADDRESS ? 'Admin' : 'User'}</span>
          </div>
          <Icon name="more" size={18} />
        </div>
      </div>
    </aside>
  )
}

export default Sidebar