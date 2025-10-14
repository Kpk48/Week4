import React from 'react'

export default function Spinner({ label = 'Loading...' }){
  return (
    <div className="spinner" role="status" aria-live="polite" aria-label={label}>
      <span className="spinner-dot" />
      <span className="spinner-dot" />
      <span className="spinner-dot" />
      <span className="help" style={{marginLeft:6}}>{label}</span>
    </div>
  )
}
