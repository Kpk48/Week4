import React from 'react'
import { Link } from 'react-router-dom'

export default function Unauthorised(){
  return (
    <div className="card" style={{marginTop:16}}>
      <h2>Unauthorised</h2>
      <p className="help">You do not have permission to access this page.</p>
      <div style={{marginTop:12}}>
        <Link className="btn" to="/">Go Home</Link>
      </div>
    </div>
  )
}
