import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import Spinner from '../../components/Spinner'

export default function CoursesList(){
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    let mounted = true
    setLoading(true)
    api.get('/api/courses')
      .then(res => mounted && setCourses(res.courses || []))
      .catch(err => mounted && setError(err.message))
      .finally(() => mounted && setLoading(false))
    return () => { mounted = false }
  }, [])

  const filtered = useMemo(() => {
    if (!query) return courses
    const q = query.toLowerCase()
    return courses.filter(c =>
      (c.title || '').toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q) ||
      (c.category || '').toLowerCase().includes(q)
    )
  }, [courses, query])

  if (loading) return <Spinner label="Loading courses" />
  if (error) return <p style={{color:'#ff6b6b'}}>Error: {error}</p>

  return (
    <div>
      <div className="section-title">
        <h2 style={{margin:0}}>Courses</h2>
        <input style={{maxWidth:260}} placeholder="Search courses" value={query} onChange={e=>setQuery(e.target.value)} />
      </div>
      <div className="grid">
        {filtered.map(c => (
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
    </div>
  )
}
