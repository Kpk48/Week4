import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }){
  const [token, setToken] = useState(() => localStorage.getItem('token') || '')
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (token && !user){
      me()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function setSession(t, u){
    if (t){
      localStorage.setItem('token', t)
      setToken(t)
    } else {
      localStorage.removeItem('token')
      setToken('')
    }
    if (u){
      localStorage.setItem('user', JSON.stringify(u))
      setUser(u)
    } else {
      localStorage.removeItem('user')
      setUser(null)
    }
  }

  async function login(email, password){
    setLoading(true)
    try{
      const res = await api.post('/api/auth/login', { email, password })
      setSession(res.token, res.user)
      return res
    } finally {
      setLoading(false)
    }
  }

  async function register(payload){
    setLoading(true)
    try{
      const res = await api.post('/api/auth/register', payload)
      setSession(res.token, res.user)
      return res
    } finally {
      setLoading(false)
    }
  }

  async function me(){
    if (!token) return null
    try{
      const res = await api.get('/api/auth/me')
      if (res?.user){
        setSession(token, res.user)
      }
      return res
    } catch(e){
      // invalid token
      logout()
      return null
    }
  }

  function logout(){
    setSession('', null)
  }

  const value = useMemo(() => ({ token, user, loading, login, register, me, logout }), [token, user, loading])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(){
  return useContext(AuthContext)
}
