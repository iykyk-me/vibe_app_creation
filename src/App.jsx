import React, { useState, useEffect } from 'react'
import LoginScreen from './components/LoginScreen'
import StudentView from './components/StudentView'
import TeacherView from './components/TeacherView'

export default function App() {
  const [mode, setMode] = useState(null) // null | 'student' | 'teacher'
  const [student, setStudent] = useState(null)

  // 로컬 스토리지에서 학생 정보 불러오기
  useEffect(() => {
    const savedId = localStorage.getItem('student_id')
    const savedNumber = localStorage.getItem('student_number')
    const savedName = localStorage.getItem('student_name')
    if (savedId && savedNumber && savedName) {
      setStudent({ studentId: savedId, studentNumber: savedNumber, studentName: savedName })
      setMode('student')
    }
  }, [])

  const handleStudentLogin = (studentData) => {
    setStudent(studentData)
    setMode('student')
  }

  const handleLogout = () => {
    localStorage.removeItem('student_id')
    localStorage.removeItem('student_number')
    localStorage.removeItem('student_name')
    setStudent(null)
    setMode(null)
  }

  // URL로 교사 모드 접근
  useEffect(() => {
    if (window.location.hash === '#teacher') {
      setMode('teacher')
    }
  }, [])

  if (mode === 'teacher') {
    return <TeacherView />
  }

  if (mode === 'student' && student) {
    return (
      <div>
        <StudentView student={student} />
        <button
          onClick={handleLogout}
          style={{
            position: 'fixed',
            bottom: '16px',
            right: '16px',
            background: '#f1f5f9',
            color: '#94a3b8',
            border: 'none',
            padding: '8px 14px',
            borderRadius: '8px',
            fontSize: '12px',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          로그아웃
        </button>
      </div>
    )
  }

  return (
    <div>
      <LoginScreen onLogin={handleStudentLogin} />
      <div style={{ textAlign: 'center', padding: '16px' }}>
        <a
          href="#teacher"
          onClick={() => setMode('teacher')}
          style={{ fontSize: '12px', color: '#94a3b8', textDecoration: 'none' }}
        >
          선생님 화면
        </a>
      </div>
    </div>
  )
}
