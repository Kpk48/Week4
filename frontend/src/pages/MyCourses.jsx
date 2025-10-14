import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import Spinner from '../components/Spinner'

export default function MyCourses(){
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load(){
    setLoading(true)
    setError('')
    try{
      const res = await api.get('/api/enrollments/my-courses')
      setItems(res.enrollments || [])
    }catch(err){
      setError(err.message)
    }finally{
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function unenroll(courseId){
    if (!window.confirm('Unenroll from this course?')) return
    try{
      await api.delete(`/api/enrollments/${courseId}`)
      await load()
    }catch(err){
      alert(err.message)
    }
  }

  if (loading) return <Spinner label="Loading my courses" />
  if (error) return <p style={{color:'#ff6b6b'}}>Error: {error}</p>

  return (
    <div>
      <h2>My Courses</h2>
      {items.length === 0 ? (
        <p className="help">You are not enrolled in any course yet.</p>
      ) : (
        <div className="grid">
          {items.map(e => (
            <div className="card" key={e.id}>
              <h3 className="card-title">{e.course?.title}</h3>
              <p className="help">{e.course?.description}</p>
              <div className="row">
                <Link to={`/courses/${e.course?.id}`} className="btn">Open</Link>
                <button className="btn danger" onClick={() => unenroll(e.course?.id)}>Unenroll</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
