import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login(){
  const { login, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const nav = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'

  async function onSubmit(e){
    e.preventDefault()
    setError('')
    try{
      await login(email, password)
      nav(from, { replace:true })
    }catch(err){
      setError(err.message || 'Login failed')
    }
  }

  return (
    <div className="form card">
      <h2>Login</h2>
      {error && <p style={{color:'#ff6b6b'}}>{error}</p>}
      <form onSubmit={onSubmit}>
        <label>Email</label>
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
        <label>Password</label>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
        <div style={{marginTop:12}}>
          <button className="btn" disabled={loading}>{loading ? 'Signing in...' : 'Login'}</button>
          <span className="help" style={{marginLeft:8}}>No account? <Link to="/register">Register</Link></span>
        </div>
      </form>
    </div>
  )
}
