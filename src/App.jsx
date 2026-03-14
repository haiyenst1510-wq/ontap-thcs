import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ProtectedRoute } from './components/ui/ProtectedRoute'
import Layout from './components/ui/Layout'

import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import TeacherDashboard from './pages/teacher/TeacherDashboard'
import QuestionsPage from './pages/teacher/QuestionsPage'
import ExamsPage from './pages/teacher/ExamsPage'
import TopicsPage from './pages/teacher/TopicsPage'
import GradesPage from './pages/teacher/GradesPage'
import ExamStatsPage from './pages/teacher/ExamStatsPage'
import ExamResultsPage from './pages/teacher/ExamResultsPage'
import LessonsPage from './pages/teacher/LessonsPage'
import LessonSubmissionsPage from './pages/teacher/LessonSubmissionsPage'
import SubjectsPage from './pages/admin/SubjectsPage'
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
  if (profile.role === 'admin') return <Navigate to="/teacher" replace />
  if (profile.role === 'teacher') return <Navigate to="/teacher" replace />
  return <Navigate to="/student" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<RootRedirect />} />

          {/* Teacher + Admin routes */}
          <Route path="/teacher" element={
            <ProtectedRoute roles={['teacher', 'admin']}>
              <Layout><TeacherDashboard /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/teacher/questions" element={
            <ProtectedRoute roles={['teacher', 'admin']}>
              <Layout><QuestionsPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/teacher/topics" element={
            <ProtectedRoute roles={['teacher', 'admin']}>
              <Layout><TopicsPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/teacher/exams" element={
            <ProtectedRoute roles={['teacher', 'admin']}>
              <Layout><ExamsPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/teacher/grades" element={
            <ProtectedRoute roles={['teacher', 'admin']}>
              <Layout><GradesPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/teacher/exam-stats" element={
            <ProtectedRoute roles={['teacher', 'admin']}>
              <Layout><ExamStatsPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/teacher/exams/:id/results" element={
            <ProtectedRoute roles={['teacher', 'admin']}>
              <Layout><ExamResultsPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/teacher/lessons" element={
            <ProtectedRoute roles={['teacher', 'admin']}>
              <Layout><LessonsPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/teacher/lessons/:id/submissions" element={
            <ProtectedRoute roles={['teacher', 'admin']}>
              <Layout><LessonSubmissionsPage /></Layout>
            </ProtectedRoute>
          } />

          {/* Admin-only routes */}
          <Route path="/admin/subjects" element={
            <ProtectedRoute roles={['admin']}>
              <Layout><SubjectsPage /></Layout>
            </ProtectedRoute>
          } />

          {/* Student routes */}
          <Route path="/student" element={
            <ProtectedRoute roles={['student']}>
              <Layout><StudentDashboard /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/student/practice" element={
            <ProtectedRoute roles={['student']}>
              <Layout><PracticePage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/student/history" element={
            <ProtectedRoute roles={['student']}>
              <Layout><HistoryPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/student/exams" element={
            <ProtectedRoute roles={['student']}>
              <Layout><StudentExamsPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/student/learn" element={
            <ProtectedRoute roles={['student']}>
              <Layout><LearnPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/student/learn/:id" element={
            <ProtectedRoute roles={['student']}>
              <Layout><LessonPage /></Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
