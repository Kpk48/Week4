import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import Spinner from '../../components/Spinner'

export default function CourseDetail(){
  const { id } = useParams()
  const { user } = useAuth()
  const [course, setCourse] = useState(null)
  const [myEnrollments, setMyEnrollments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const nav = useNavigate()

  const enrolled = useMemo(() => {
    return myEnrollments.some(e => String(e.course?.id || e.course_id) === String(id))
  }, [myEnrollments, id])

  useEffect(() => {
    let mounted = true
    async function load(){
      setLoading(true)
      try{
        const c = await api.get(`/api/courses/${id}`)
        if (!mounted) return
        setCourse(c.course)
        if (user?.role === 'student'){
          const my = await api.get('/api/enrollments/my-courses')
          if (!mounted) return
          setMyEnrollments(my.enrollments || [])
        }
      }catch(err){
        if (mounted) setError(err.message)
      }finally{
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [id, user?.role])

  async function handleEnroll(){
    try{
      await api.post('/api/enrollments', { course_id: id })
      const my = await api.get('/api/enrollments/my-courses')
      setMyEnrollments(my.enrollments || [])
    }catch(err){
      alert(err.message)
    }
  }

  async function handleUnenroll(){
    try{
      await api.delete(`/api/enrollments/${id}`)
      const my = await api.get('/api/enrollments/my-courses')
      setMyEnrollments(my.enrollments || [])
    }catch(err){
      alert(err.message)
    }
  }

  async function handleDelete(){
    if (!window.confirm('Delete this course?')) return
    try{
      await api.delete(`/api/courses/${id}`)
      nav('/courses')
    }catch(err){
      alert(err.message)
    }
  }

  if (loading) return <Spinner label="Loading course" />
  if (error) return <p style={{color:'#ff6b6b'}}>Error: {error}</p>
  if (!course) return <p>Not found</p>

  return (
    <div className="card">
      <h2 style={{marginTop:0}}>{course.title}</h2>
      <p className="help">{course.description}</p>
      <div className="row">
        {course.category && <span className="badge">{course.category}</span>}
        {course.difficulty_level && <span className="badge">{course.difficulty_level}</span>}
      </div>

      <hr />
      <h3 style={{marginTop:0}}>Lessons</h3>
      {Array.isArray(course.lessons) && course.lessons.length > 0 ? (
        <ul>
          {course.lessons.map(lesson => (
            <li key={lesson.id}>{lesson.order_index}. {lesson.title}</li>
          ))}
        </ul>
      ) : (
        <p className="help">No lessons yet.</p>
      )}

      <div className="row" style={{marginTop:12}}>
        {user?.role === 'student' && !enrolled && (
          <button className="btn" onClick={handleEnroll}>Enroll</button>
        )}
        {user?.role === 'student' && enrolled && (
          <button className="btn danger" onClick={handleUnenroll}>Unenroll</button>
        )}
        {(user?.role === 'admin' || user?.role === 'instructor') && (
          <button className="btn secondary" onClick={handleDelete}>Delete Course</button>
        )}
      </div>
    </div>
  )
}
