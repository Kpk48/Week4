import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

export default function CreateCourse(){
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [difficulty_level, setLevel] = useState('')
  const [estimated_duration, setDuration] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()

  async function onSubmit(e){
    e.preventDefault()
    setError('')
    setLoading(true)
    try{
      const body = { title, description }
      if (category) body.category = category
      if (difficulty_level) body.difficulty_level = difficulty_level
      if (estimated_duration) body.estimated_duration = estimated_duration
      const res = await api.post('/api/courses', body)
      nav(`/courses/${res.course.id}`)
    }catch(err){
      setError(err.message || 'Failed to create course')
    }finally{
      setLoading(false)
    }
  }

  return (
    <div className="form card">
      <h2>Create Course</h2>
      {error && <p style={{color:'#ff6b6b'}}>{error}</p>}
      <form onSubmit={onSubmit}>
        <label>Title</label>
        <input value={title} onChange={e=>setTitle(e.target.value)} required />
        <label>Description</label>
        <textarea rows={4} value={description} onChange={e=>setDescription(e.target.value)} required />
        <div className="row">
          <div style={{flex:1}}>
            <label>Category</label>
            <input value={category} onChange={e=>setCategory(e.target.value)} placeholder="e.g., Programming" />
          </div>
          <div style={{flex:1}}>
            <label>Difficulty</label>
            <select value={difficulty_level} onChange={e=>setLevel(e.target.value)}>
              <option value="">Select</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>
        </div>
        <label>Estimated duration (e.g., 5h 30m)</label>
        <input value={estimated_duration} onChange={e=>setDuration(e.target.value)} />
        <div style={{marginTop:12}}>
          <button className="btn" disabled={loading}>{loading ? 'Creating...' : 'Create course'}</button>
        </div>
      </form>
    </div>
  )
}
