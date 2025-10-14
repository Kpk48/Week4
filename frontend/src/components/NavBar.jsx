import React from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function NavBar(){
  const { user, logout } = useAuth()
  const nav = useNavigate()

  function handleLogout(){
    logout()
    nav('/')
  }

  const navClass = ({ isActive }) => `nav-link ${isActive ? 'active' : ''}`

  return (
    <nav>
      <div className="nav-inner">
        <div className="nav-links">
          <Link to="/" className="brand nav-link" style={{paddingLeft:0}}>
            <span className="dot" aria-hidden="true"></span>
            Smart Learning
          </Link>
          <NavLink to="/courses" className={navClass}>Courses</NavLink>
          {user?.role === 'student' && (
            <NavLink to="/my-courses" className={navClass}>My Courses</NavLink>
          )}
          {(user?.role === 'instructor' || user?.role === 'admin') && (
            <NavLink to="/create-course" className={navClass}>Create Course</NavLink>
          )}
        </div>
        <div className="row">
          {!user ? (
            <>
              <Link to="/login" className="btn secondary">Login</Link>
              <Link to="/register" className="btn">Register</Link>
            </>
          ) : (
            <>
              <span className="badge">{user.full_name} · {user.role}</span>
              <button className="btn secondary" onClick={handleLogout}>Logout</button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
