import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import CreateScheduleModal from './components/CreateScheduleModal'
import DashboardPage from './pages/DashboardPage'
import SchedulesPage from './pages/SchedulesPage'
import RecipientsPage from './pages/RecipientsPage'
import TreasuryPage from './pages/TreasuryPage'
import { useVestingContract } from './hooks/useVestingContract'
import './App.css'

const pageTitles = {
  overview: 'Overview',
  schedules: 'Vesting schedules',
  recipients: 'Recipients',
  treasury: 'Treasury',
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : 'The blockchain request failed.'
}

function App() {
  const [activePage, setActivePage] = useState('overview')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [scheduleQuery, setScheduleQuery] = useState('')
  const [toast, setToast] = useState('')
  const vesting = useVestingContract()

  function showToast(message) {
    setToast(message)
    window.setTimeout(() => setToast(''), 5000)
  }

  async function handleConnect() {
    try {
      await vesting.connectWallet()
    } catch (error) {
      showToast(getErrorMessage(error))
    }
  }

  async function handleCreateSchedule(values) {
    try {
      await vesting.createSchedule(values, showToast)
      setIsCreateOpen(false)
      setActivePage('schedules')
      showToast('Vesting schedule created successfully.')
    } catch (error) {
      showToast(getErrorMessage(error))
    }
  }

  async function handleRelease(schedule) {
    try {
      await vesting.releaseSchedule(schedule)
      showToast('Claimable tokens released successfully.')
    } catch (error) {
      showToast(getErrorMessage(error))
    }
  }

  function handleSearch(query) {
    setScheduleQuery(query)
    if (query.trim()) setActivePage('schedules')
  }

  const commonProps = {
    schedules: vesting.schedules,
    totals: vesting.totals,
    tokenSymbol: vesting.tokenSymbol,
    onCreate: () => {
      if (vesting.canCreate) setIsCreateOpen(true)
      else showToast('Connect the vesting contract owner wallet on Sepolia to create a schedule.')
    },
    onNotify: showToast,
    onRelease: handleRelease,
  }

  function renderPage() {
    switch (activePage) {
      case 'schedules':
        return (
          <SchedulesPage
            {...commonProps}
            initialQuery={scheduleQuery}
            onQueryChange={setScheduleQuery}
            isLoading={vesting.isLoading}
          />
        )
      case 'recipients':
        return <RecipientsPage {...commonProps} />
      case 'treasury':
        return (
          <TreasuryPage
            {...commonProps}
            tokenBalance={vesting.tokenBalance}
            vestingAddress={vesting.vestingAddress}
          />
        )
      default:
        return (
          <DashboardPage
            {...commonProps}
            onViewSchedules={() => setActivePage('schedules')}
          />
        )
    }
  }

  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        onCreate={commonProps.onCreate}
        onSettings={() => showToast('Workspace settings are coming soon.')}
      />
      <main className="main-area">
        <Topbar
          title={pageTitles[activePage]}
          onSearch={handleSearch}
          onConnect={handleConnect}
          walletLabel={vesting.walletLabel}
          isConnected={vesting.isConnected}
          onNotifications={() => showToast('You’re all caught up.')}
        />
        <div className="page-content">
          {vesting.contractNotice && (
            <div className="integration-notice" role="status">
              <span className={`wallet-dot${vesting.isConnected && vesting.isCorrectNetwork ? ' connected' : ''}`} />
              {vesting.contractNotice}
              {vesting.loadError && (
                <button type="button" onClick={vesting.refresh}>Retry</button>
              )}
            </div>
          )}
          {renderPage()}
        </div>
      </main>
      {isCreateOpen && (
        <CreateScheduleModal
          onClose={() => setIsCreateOpen(false)}
          onSubmit={handleCreateSchedule}
          tokenSymbol={vesting.tokenSymbol}
          isSubmitting={vesting.isSubmitting}
        />
      )}
      {toast && (
        <div className="toast-message" role="status">
          <span className="toast-check">✓</span>
          {toast}
        </div>
      )}
    </div>
  )
}

export default App
