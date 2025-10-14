import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register(){
  const { register, loading } = useAuth()
  const [full_name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('student')
  const [error, setError] = useState('')
  const nav = useNavigate()

  async function onSubmit(e){
    e.preventDefault()
    setError('')
    try{
      await register({ full_name, email, password, role })
      nav('/')
    }catch(err){
      setError(err.message || 'Registration failed')
    }
  }

  return (
    <div className="form card">
      <h2>Register</h2>
      {error && <p style={{color:'#ff6b6b'}}>{error}</p>}
      <form onSubmit={onSubmit}>
        <label>Full name</label>
        <input value={full_name} onChange={e=>setName(e.target.value)} required />
        <label>Email</label>
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
        <label>Password</label>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
        <label>Role</label>
        <select value={role} onChange={e=>setRole(e.target.value)}>
          <option value="student">Student</option>
          <option value="instructor">Instructor</option>
        </select>
        <div style={{marginTop:12}}>
          <button className="btn" disabled={loading}>{loading ? 'Creating...' : 'Create account'}</button>
          <span className="help" style={{marginLeft:8}}>Have an account? <Link to="/login">Login</Link></span>
        </div>
      </form>
    </div>
  )
}
