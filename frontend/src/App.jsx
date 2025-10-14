import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import CoursesList from './pages/Courses/List'
import CourseDetail from './pages/Courses/Detail'
import MyCourses from './pages/MyCourses'
import CreateCourse from './pages/CreateCourse'
import Unauthorised from './pages/Unauthorised'
import NavBar from './components/NavBar'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <div className="app">
      <NavBar />
      <div className="container">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/courses" element={<CoursesList />} />
          <Route path="/courses/:id" element={<CourseDetail />} />

          <Route element={<ProtectedRoute roles={["student"]} />}> 
            <Route path="/my-courses" element={<MyCourses />} />
          </Route>

          <Route element={<ProtectedRoute roles={["instructor","admin"]} />}> 
            <Route path="/create-course" element={<CreateCourse />} />
          </Route>

          <Route path="/unauthorised" element={<Unauthorised />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  )
}
