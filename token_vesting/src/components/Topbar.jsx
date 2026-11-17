import { useState } from 'react'
import Icon from './Icon'

function Topbar({
  title,
  onSearch,
  onConnect,
  onNotifications,
  walletLabel,
  isConnected,
}) {
  const [query, setQuery] = useState('')

  function handleKeyDown(event) {
    if (event.key === 'Enter') {
      onSearch(query)
    }
  }

  return (
    <header className="topbar">
      <div className="breadcrumb">
        <span>Workspace</span>
        <span className="breadcrumb-slash">/</span>
        <strong>{title}</strong>
      </div>
      <div className="topbar-actions">
        <label className="search-box">
          <Icon name="search" size={18} />
          <input
            type="search"
            placeholder="Search schedules..."
            aria-label="Search schedules"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
          />
          <kbd>⌘ K</kbd>
        </label>
        <button
          className="icon-button notification-button"
          type="button"
          aria-label="Notifications"
          onClick={onNotifications}
        >
          <Icon name="bell" size={19} />
          <span />
        </button>
        <button
          className="connect-button"
          type="button"
          onClick={onConnect}
          aria-label={isConnected ? 'Disconnect wallet or switch network' : 'Connect wallet'}
        >
          <span className={`wallet-dot${isConnected ? ' connected' : ''}`} />
          {walletLabel}
        </button>
      </div>
    </header>
  )
}

export default Topbar
