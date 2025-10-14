import React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ roles }){
  const { user } = useAuth()
  const location = useLocation()

  if (!user){
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  if (roles && roles.length > 0 && !roles.includes(user.role)){
    return <Navigate to="/unauthorised" replace />
  }
  return <Outlet />
}
