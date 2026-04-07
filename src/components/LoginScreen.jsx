import React, { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function LoginScreen({ onLogin }) {
  const [studentNumber, setStudentNumber] = useState('')
  const [studentName, setStudentName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    if (!studentNumber.trim() || !studentName.trim()) {
      setError('학번과 이름을 모두 입력해주세요')
      return
    }
    setLoading(true)
    setError('')

    const studentId = `${studentNumber.trim()}_${studentName.trim()}`

    try {
      // 기존 학생 확인 후 없으면 등록
      const { data: existing } = await supabase
        .from('students')
        .select('*')
        .eq('student_id', studentId)
        .maybeSingle()

      if (!existing) {
        await supabase.from('students').insert({
          student_id: studentId,
          student_number: studentNumber.trim(),
          student_name: studentName.trim()
        })
      }

      // 로컬 스토리지에 저장
      localStorage.setItem('student_id', studentId)
      localStorage.setItem('student_number', studentNumber.trim())
      localStorage.setItem('student_name', studentName.trim())

      onLogin({ studentId, studentNumber: studentNumber.trim(), studentName: studentName.trim() })
    } catch (err) {
      console.error(err)
      setError('오류가 발생했습니다. 다시 시도해주세요')
    }
    setLoading(false)
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>🚀</div>
        <h1 style={styles.title}>바이브 코딩 동아리</h1>
        <p style={styles.subtitle}>학번과 이름을 입력하고 시작하세요</p>

        <div style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>학번</label>
            <input
              style={styles.input}
              type="text"
              placeholder="예) 20301"
              value={studentNumber}
              onChange={e => setStudentNumber(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>이름</label>
            <input
              style={styles.input}
              type="text"
              placeholder="예) 홍길동"
              value={studentName}
              onChange={e => setStudentName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>
          {error && <p style={styles.error}>{error}</p>}
          <button
            style={styles.button}
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? '로딩 중...' : '시작하기'}
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #E0F7F5 0%, #FFE5E5 100%)',
    padding: '20px',
  },
  card: {
    background: '#fff',
    borderRadius: '24px',
    padding: '48px 40px',
    width: '100%',
    maxWidth: '440px',
    boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
    textAlign: 'center',
  },
  logo: {
    fontSize: '56px',
    marginBottom: '16px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '16px',
    color: '#64748b',
    marginBottom: '36px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  inputGroup: {
    textAlign: 'left',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '700',
    color: '#475569',
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    fontSize: '18px',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  error: {
    color: '#FF6B6B',
    fontSize: '14px',
    textAlign: 'left',
  },
  button: {
    background: '#4ECDC4',
    color: '#fff',
    fontSize: '18px',
    fontWeight: '700',
    padding: '16px',
    borderRadius: '12px',
    marginTop: '8px',
    transition: 'background 0.2s',
  },
}
