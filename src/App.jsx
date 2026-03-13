import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ProtectedRoute } from './components/ui/ProtectedRoute'
import Layout from './components/ui/Layout'

import LoginPage from './pages/LoginPage'
import TeacherDashboard from './pages/teacher/TeacherDashboard'
import QuestionsPage from './pages/teacher/QuestionsPage'
import ExamsPage from './pages/teacher/ExamsPage'
import TopicsPage from './pages/teacher/TopicsPage'
import GradesPage from './pages/teacher/GradesPage'
import ClassesPage from './pages/teacher/ClassesPage'
import StudentsPage from './pages/teacher/StudentsPage'
import ExamStatsPage from './pages/teacher/ExamStatsPage'
import ExamResultsPage from './pages/teacher/ExamResultsPage'
import LessonsPage from './pages/teacher/LessonsPage'
import LessonSubmissionsPage from './pages/teacher/LessonSubmissionsPage'
import StudentDashboard from './pages/student/StudentDashboard'
import PracticePage from './pages/student/PracticePage'
import HistoryPage from './pages/student/HistoryPage'
import StudentExamsPage from './pages/student/ExamsPage'
import LearnPage from './pages/student/LearnPage'
import LessonPage from './pages/student/LessonPage'

function RootRedirect() {
  const { profile, loading } = useAuth()
  if (loading) return null
  if (!profile) return <Navigate to="/login" replace />
  return profile.role === 'teacher'
    ? <Navigate to="/teacher" replace />
    : <Navigate to="/student" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<RootRedirect />} />

          {/* Teacher routes */}
          <Route path="/teacher" element={
            <ProtectedRoute role="teacher">
              <Layout><TeacherDashboard /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/teacher/questions" element={
            <ProtectedRoute role="teacher">
              <Layout><QuestionsPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/teacher/topics" element={
            <ProtectedRoute role="teacher">
              <Layout><TopicsPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/teacher/exams" element={
            <ProtectedRoute role="teacher">
              <Layout><ExamsPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/teacher/grades" element={
            <ProtectedRoute role="teacher">
              <Layout><GradesPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/teacher/classes" element={
            <ProtectedRoute role="teacher">
              <Layout><ClassesPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/teacher/students" element={
            <ProtectedRoute role="teacher">
              <Layout><StudentsPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/teacher/exam-stats" element={
            <ProtectedRoute role="teacher">
              <Layout><ExamStatsPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/teacher/exams/:id/results" element={
            <ProtectedRoute role="teacher">
              <Layout><ExamResultsPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/teacher/lessons" element={
            <ProtectedRoute role="teacher">
              <Layout><LessonsPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/teacher/lessons/:id/submissions" element={
            <ProtectedRoute role="teacher">
              <Layout><LessonSubmissionsPage /></Layout>
            </ProtectedRoute>
          } />

          {/* Student routes */}
          <Route path="/student" element={
            <ProtectedRoute role="student">
              <Layout><StudentDashboard /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/student/practice" element={
            <ProtectedRoute role="student">
              <Layout><PracticePage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/student/history" element={
            <ProtectedRoute role="student">
              <Layout><HistoryPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/student/exams" element={
            <ProtectedRoute role="student">
              <Layout><StudentExamsPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/student/learn" element={
            <ProtectedRoute role="student">
              <Layout><LearnPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/student/learn/:id" element={
            <ProtectedRoute role="student">
              <Layout><LessonPage /></Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
