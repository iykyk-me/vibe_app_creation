import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { SESSION1_STEPS } from '../sessions/session1'
import StudentView from './StudentView'

const TEACHER_PASSWORD = '1234'

export default function TeacherView() {
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [session, setSession] = useState({ current_step: 0, current_substep: 0 })
  const [paddletUrl, setPaddletUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [studentCount, setStudentCount] = useState(0)
  const [answeredCount, setAnsweredCount] = useState(0)
  const sessionRef = useRef({ current_step: 0, current_substep: 0 })

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  useEffect(() => {
    if (!authenticated) return
    fetchSession()
    fetchStats()

    // 구독은 한 번만 생성
    const channel = supabase
      .channel('teacher_progress')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_progress' }, () => {
        fetchStats()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
        fetchStats()
      })
      .subscribe()

    // 5초 폴링 백업
    const interval = setInterval(fetchStats, 5000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [authenticated])

  const fetchSession = async () => {
    const { data } = await supabase.from('session').select('*').eq('id', 1).single()
    if (data) {
      setSession(data)
      setPaddletUrl(data.paddlet_url || '')
    }
  }

  const fetchStats = async () => {
    const s = sessionRef.current

    // 로그인한 학생 수
    const { data: studentData } = await supabase
      .from('students')
      .select('student_id')
    setStudentCount(studentData?.length || 0)

    // 현재 단계에서 입력 완료한 학생 수
    const currentSubstep = SESSION1_STEPS[s.current_step]?.substeps[s.current_substep]
    if (currentSubstep?.field) {
      const { data: progressData } = await supabase
        .from('student_progress')
        .select('data')
        .eq('session_num', 1)
      const answered = (progressData || []).filter(p =>
        p.data && p.data[`${currentSubstep.field}_submitted`] === true
      ).length
      setAnsweredCount(answered)
    } else {
      setAnsweredCount(0)
    }
  }

  const handleLogin = () => {
    if (password === TEACHER_PASSWORD) {
      setAuthenticated(true)
      setError('')
    } else {
      setError('비밀번호가 틀렸습니다')
    }
  }

  const updateSession = async (newStep, newSubstep) => {
    setSaving(true)
    const { error } = await supabase
      .from('session')
      .update({ current_step: newStep, current_substep: newSubstep })
      .eq('id', 1)
    if (!error) setSession(prev => ({ ...prev, current_step: newStep, current_substep: newSubstep }))
    setSaving(false)
  }

  const goNext = async () => {
    const currentStepData = SESSION1_STEPS[session.current_step]
    if (!currentStepData) return

    if (session.current_substep < currentStepData.substeps.length - 1) {
      await updateSession(session.current_step, session.current_substep + 1)
    } else if (session.current_step < SESSION1_STEPS.length - 1) {
      await updateSession(session.current_step + 1, 0)
    }
  }

  const goPrev = async () => {
    if (session.current_substep > 0) {
      await updateSession(session.current_step, session.current_substep - 1)
    } else if (session.current_step > 0) {
      const prevStepData = SESSION1_STEPS[session.current_step - 1]
      await updateSession(session.current_step - 1, prevStepData.substeps.length - 1)
    }
  }

  const resetPersonas = async () => {
    if (!window.confirm('페르소나 배정 및 모든 학생 데이터를 초기화할까요?')) return
    await supabase.from('personas').update({ assigned_to: null }).neq('id', 0)
    await supabase.from('student_progress').delete().neq('student_id', '')
    await supabase.from('students').delete().neq('student_id', '')
    await supabase.from('session').update({ 
      current_step: 0, 
      current_substep: 0,
      reset_at: new Date().toISOString()
    }).eq('id', 1)
    setSession({ current_step: 0, current_substep: 0 })
    setStudentCount(0)
    setAnsweredCount(0)
    alert('초기화 완료!')
  }

  const downloadExcel = async () => {
    // 학생 목록 가져오기
    const { data: students } = await supabase.from('students').select('*')
    const { data: personas } = await supabase.from('personas').select('*')
    const { data: progress } = await supabase.from('student_progress').select('*').eq('session_num', 1)

    if (!students?.length) { alert('학생 데이터가 없습니다'); return }

    const personaMap = {}
    personas?.forEach(p => { if (p.assigned_to) personaMap[p.assigned_to] = p })

    const progressMap = {}
    progress?.forEach(p => { progressMap[p.student_id] = p.data || {} })

    // CSV 생성
    const headers = ['학번', '이름', '페르소나', '불편함①', '불편함②', 'AI불편함①', 'AI불편함②', 'AI불편함③', '선택한문제', '선택이유']
    const rows = students.map(s => {
      const p = progressMap[s.student_id] || {}
      const persona = personaMap[s.student_id]
      return [
        s.student_number,
        s.student_name,
        persona ? `${persona.name}(${persona.age} ${persona.job})` : '',
        p.discomfort_1 || '',
        p.discomfort_2 || '',
        p.ai_discomfort_1 || '',
        p.ai_discomfort_2 || '',
        p.ai_discomfort_3 || '',
        p.selected_item || '',
        p.reason || '',
      ]
    })

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('
')

    const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `코딩동아리_1차시_${new Date().toLocaleDateString('ko-KR').replace(/\. /g,'-').replace('.','')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const savePaddletUrl = async () => {
    await supabase.from('session').update({ paddlet_url: paddletUrl }).eq('id', 1)
    alert('패들렛 URL이 저장되었습니다')
  }

  const currentStepData = SESSION1_STEPS[session.current_step]
  const isFirst = session.current_step === 0 && session.current_substep === 0
  const isLast = session.current_step === SESSION1_STEPS.length - 1 &&
    session.current_substep === (SESSION1_STEPS[SESSION1_STEPS.length - 1]?.substeps.length - 1)

  if (!authenticated) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginCard}>
          <div style={styles.lockIcon}>🔐</div>
          <h2 style={styles.loginTitle}>선생님 화면</h2>
          <input
            style={styles.input}
            type="password"
            placeholder="비밀번호 입력"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.button} onClick={handleLogin}>확인</button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* 왼쪽: 학생 화면 미리보기 */}
      <div style={styles.preview}>
        <div style={styles.previewLabel}>학생 화면 미리보기</div>
        <div style={styles.previewContent}>
          <StudentView student={{ studentId: 'preview', studentName: '미리보기', studentNumber: '00000' }} />
        </div>
      </div>

      {/* 오른쪽: 교사 컨트롤 패널 */}
      <div style={styles.controlPanel}>
        <h2 style={styles.panelTitle}>교사 컨트롤</h2>

        {/* 현재 단계 표시 */}
        <div style={styles.currentStep}>
          <div style={styles.stepInfo}>
            <span style={styles.stepLabel}>현재 단계</span>
            <span style={styles.stepValue}>{currentStepData?.title}</span>
          </div>
          <div style={styles.stepInfo}>
            <span style={styles.stepLabel}>소단계</span>
            <span style={styles.stepValue}>
              {session.current_substep + 1} / {currentStepData?.substeps.length}
            </span>
          </div>
          <div style={styles.subInstruction}>
            {currentStepData?.substeps[session.current_substep]?.instruction}
          </div>
          {currentStepData?.substeps[session.current_substep]?.field && (
            <div style={styles.responseBox}>
              <span style={styles.responseLabel}>학생 응답 현황</span>
              <div style={styles.responseCount}>
                <span style={styles.answeredNum}>{answeredCount}</span>
                <span style={styles.totalNum}> / {studentCount}명</span>
              </div>
              <div style={styles.responseBar}>
                <div style={{
                  ...styles.responseBarFill,
                  width: studentCount > 0 ? `${(answeredCount / studentCount) * 100}%` : '0%'
                }} />
              </div>
            </div>
          )}
        </div>

        {/* 이전/다음 버튼 */}
        <div style={styles.navButtons}>
          <button
            style={{ ...styles.navBtn, ...styles.prevBtn, opacity: isFirst ? 0.4 : 1 }}
            onClick={goPrev}
            disabled={isFirst || saving}
          >
            ← 이전
          </button>
          <button
            style={{ ...styles.navBtn, ...styles.nextBtn, opacity: isLast ? 0.4 : 1 }}
            onClick={goNext}
            disabled={isLast || saving}
          >
            다음 →
          </button>
        </div>

        {/* 단계 목록 */}
        <div style={styles.stepList}>
          <div style={styles.stepListTitle}>전체 단계</div>
          {SESSION1_STEPS.map((s, idx) => (
            <div
              key={idx}
              style={{
                ...styles.stepItem,
                background: idx === session.current_step ? '#E0F7F5' : '#f8fafc',
                borderLeft: idx === session.current_step ? '4px solid #4ECDC4' : '4px solid transparent',
              }}
              onClick={() => updateSession(idx, 0)}
            >
              <span style={styles.stepItemNum}>{idx + 1}</span>
              <span style={styles.stepItemTitle}>{s.title}</span>
              {idx < session.current_step && <span style={styles.checkMark}>✓</span>}
            </div>
          ))}
        </div>

        {/* 패들렛 URL */}
        <div style={styles.paddletSection}>
          <div style={styles.stepListTitle}>패들렛 URL</div>
          <input
            style={styles.urlInput}
            type="text"
            placeholder="패들렛 링크 입력"
            value={paddletUrl}
            onChange={e => setPaddletUrl(e.target.value)}
          />
          <button style={styles.saveBtn} onClick={savePaddletUrl}>저장</button>
        </div>

        {/* 데이터 다운로드 */}
        <button style={styles.downloadBtn} onClick={downloadExcel}>
          📥 학생 데이터 다운로드
        </button>

        {/* 초기화 버튼 */}
        <button style={styles.resetBtn} onClick={resetPersonas}>
          🔄 페르소나 배정 초기화
        </button>
      </div>
    </div>
  )
}

const styles = {
  loginContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f8fafc',
  },
  loginCard: {
    background: '#fff',
    borderRadius: '20px',
    padding: '40px',
    width: '320px',
    textAlign: 'center',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  },
  lockIcon: { fontSize: '48px', marginBottom: '16px' },
  loginTitle: { fontSize: '22px', fontWeight: '900', marginBottom: '24px', color: '#1a1a2e' },
  input: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '16px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    marginBottom: '12px',
    fontFamily: 'inherit',
  },
  error: { color: '#FF6B6B', fontSize: '14px', marginBottom: '12px' },
  button: {
    width: '100%',
    background: '#4ECDC4',
    color: '#fff',
    fontSize: '16px',
    fontWeight: '700',
    padding: '14px',
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  container: {
    display: 'flex',
    minHeight: '100vh',
  },
  preview: {
    flex: 1,
    borderRight: '2px solid #e2e8f0',
    overflow: 'auto',
  },
  previewLabel: {
    background: '#1a1a2e',
    color: '#4ECDC4',
    padding: '10px 16px',
    fontSize: '13px',
    fontWeight: '700',
    letterSpacing: '1px',
  },
  previewContent: {
    pointerEvents: 'none',
    opacity: 0.9,
  },
  controlPanel: {
    width: '320px',
    background: '#fff',
    padding: '20px',
    boxShadow: '-4px 0 20px rgba(0,0,0,0.06)',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  panelTitle: {
    fontSize: '20px',
    fontWeight: '900',
    color: '#1a1a2e',
  },
  currentStep: {
    background: '#f8fafc',
    borderRadius: '12px',
    padding: '16px',
  },
  stepInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  stepLabel: {
    fontSize: '12px',
    color: '#94a3b8',
    fontWeight: '600',
  },
  stepValue: {
    fontSize: '14px',
    color: '#1a1a2e',
    fontWeight: '700',
  },
  subInstruction: {
    fontSize: '13px',
    color: '#475569',
    lineHeight: '1.6',
    marginTop: '8px',
    borderTop: '1px solid #e2e8f0',
    paddingTop: '8px',
  },
  navButtons: {
    display: 'flex',
    gap: '8px',
  },
  navBtn: {
    flex: 1,
    padding: '14px',
    fontSize: '16px',
    fontWeight: '700',
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  prevBtn: {
    background: '#f1f5f9',
    color: '#475569',
  },
  nextBtn: {
    background: '#FF6B6B',
    color: '#fff',
  },
  stepList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  stepListTitle: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: '1px',
    marginBottom: '8px',
  },
  stepItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  stepItemNum: {
    width: '24px',
    height: '24px',
    background: '#4ECDC4',
    color: '#fff',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '700',
    flexShrink: 0,
  },
  stepItemTitle: {
    fontSize: '14px',
    color: '#334155',
    flex: 1,
  },
  checkMark: {
    color: '#4ECDC4',
    fontWeight: '700',
  },
  paddletSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  urlInput: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '13px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontFamily: 'inherit',
  },
  saveBtn: {
    background: '#4ECDC4',
    color: '#fff',
    padding: '10px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '700',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  responseBox: {
    marginTop: '12px',
    background: '#f0fdf9',
    borderRadius: '10px',
    padding: '12px',
    border: '1px solid #4ECDC4',
  },
  responseLabel: {
    fontSize: '11px', fontWeight: '700', color: '#2BA39A',
    letterSpacing: '1px', display: 'block', marginBottom: '6px',
  },
  responseCount: { display: 'flex', alignItems: 'baseline', marginBottom: '8px' },
  answeredNum: { fontSize: '28px', fontWeight: '900', color: '#4ECDC4' },
  totalNum: { fontSize: '14px', color: '#94a3b8' },
  responseBar: {
    height: '8px', background: '#e2e8f0',
    borderRadius: '4px', overflow: 'hidden',
  },
  responseBarFill: {
    height: '100%', background: '#4ECDC4',
    borderRadius: '4px', transition: 'width 0.5s ease',
  },
  downloadBtn: {
    background: '#4ECDC4',
    color: '#fff',
    padding: '12px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    fontFamily: 'inherit',
    border: 'none',
    width: '100%',
  },
  resetBtn: {
    background: '#fff',
    border: '2px solid #FF6B6B',
    color: '#FF6B6B',
    padding: '12px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
}
