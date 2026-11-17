import { useState } from 'react'
import Icon from './Icon'

function CreateScheduleModal({
  onClose,
  onSubmit,
  tokenSymbol,
  isSubmitting,
}) {
  const [form, setForm] = useState({
    address: '',
    amount: '',
    start: new Date().toISOString().slice(0, 10),
    duration: '24',
    cliff: '6',
  })

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    onSubmit(form)
  }

  return (
    <div className="modal-backdrop" onMouseDown={() => !isSubmitting && onClose()}>
      <section
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-schedule-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <span className="modal-icon"><Icon name="calendar" size={20} /></span>
            <h2 id="create-schedule-title">Create vesting schedule</h2>
            <p>Set the allocation and unlock terms for a recipient.</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} disabled={isSubmitting} aria-label="Close dialog">
            <Icon name="close" size={19} />
          </button>
        </div>

        <form className="schedule-form" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Wallet address</span>
            <input
              name="address"
              value={form.address}
              onChange={updateField}
              placeholder="0x..."
              required
              pattern="0x[a-fA-F0-9]{40}"
              title="Enter a valid 42-character Ethereum address."
            />
          </label>
          <label className="form-field">
            <span>Token amount</span>
            <div className="input-with-suffix">
              <input
                name="amount"
                value={form.amount}
                onChange={updateField}
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                required
              />
              <span>{tokenSymbol}</span>
            </div>
          </label>
          <div className="form-grid">
            <label className="form-field">
              <span>Start date</span>
              <input
                name="start"
                value={form.start}
                onChange={updateField}
                type="date"
                required
              />
            </label>
            <label className="form-field">
              <span>Duration</span>
              <div className="input-with-suffix">
                <input
                  name="duration"
                  value={form.duration}
                  onChange={updateField}
                  type="number"
                  min="1"
                  max="120"
                  required
                />
                <span>months</span>
              </div>
            </label>
          </div>
          <label className="form-field">
            <span>Cliff period</span>
            <div className="input-with-suffix">
              <input
                name="cliff"
                value={form.cliff}
                onChange={updateField}
                type="number"
                min="0"
                max={form.duration}
                required
              />
              <span>months</span>
            </div>
            <small className="field-hint">Tokens begin unlocking after the cliff.</small>
          </label>
          <div className="demo-notice">
            <Icon name="shield" size={17} />
            <span>Creating a schedule requires an ERC-20 approval and a contract transaction.</span>
          </div>
          <div className="modal-actions">
            <button className="button-secondary" type="button" onClick={onClose} disabled={isSubmitting}>Cancel</button>
            <button className="button-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Confirm in wallet…' : 'Create schedule'} <Icon name="arrowRight" size={17} />
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default CreateScheduleModal
