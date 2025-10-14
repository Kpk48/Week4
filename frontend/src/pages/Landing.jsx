import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import Spinner from '../components/Spinner'

export default function Landing(){
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    api.get('/api/courses')
      .then(res => mounted && setCourses(res.courses || []))
      .finally(() => mounted && setLoading(false))
    return () => { mounted = false }
  }, [])

  return (
    <div>
      <div className="card" style={{marginTop:16, padding:'22px'}}>
        <h1 style={{marginTop:0,marginBottom:6}}>Welcome to Smart Learning Hub</h1>
        <p className="help">Explore curated courses, learn at your pace, and track your progress with beautiful analytics.</p>
        <div className="row" style={{marginTop:12}}>
          <Link className="btn" to="/courses">Browse Courses</Link>
          <a className="btn secondary" href="/api" target="_blank" rel="noreferrer">API Docs</a>
        </div>
      </div>
      <div className="section-title" style={{marginTop:24}}>
        <h2 style={{margin:0}}>Latest Courses</h2>
        <Link to="/courses" className="nav-link">View all</Link>
      </div>
      {loading ? (
        <Spinner label="Loading courses" />
      ) : (
        <div className="grid">
          {courses.slice(0,6).map(c => (
            <div className="card" key={c.id}>
              <h3 className="card-title">{c.title}</h3>
              <p className="help">{c.description}</p>
              <div className="row">
                {c.category && <span className="badge">{c.category}</span>}
                {c.difficulty_level && <span className="badge">{c.difficulty_level}</span>}
              </div>
              <div className="card-actions">
                <Link className="btn" to={`/courses/${c.id}`}>View</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
