import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { SESSION1_STEPS } from '../sessions/session1'

export default function StudentView({ student }) {
  const [session, setSession] = useState({ current_step: 0, current_substep: 0 })
  const [persona, setPersona] = useState(null)
  const [progress, setProgress] = useState({})
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [checkedItems, setCheckedItems] = useState([])
  const [selectedItem, setSelectedItem] = useState('')
  const [paddletUrl, setPaddletUrl] = useState('')

  // 세션 실시간 구독
  useEffect(() => {
    fetchSession()
    const channel = supabase
      .channel('session_changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'session' }, payload => {
        setSession(payload.new)
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  // 학생 데이터 불러오기
  useEffect(() => {
    fetchPersona()
    fetchProgress()
    fetchPaddletUrl()
  }, [])

  const fetchSession = async () => {
    const { data } = await supabase.from('session').select('*').eq('id', 1).single()
    if (data) setSession(data)
  }

  const fetchPersona = async () => {
    const { data } = await supabase
      .from('personas')
      .select('*')
      .eq('assigned_to', student.studentId)
      .single()
    if (data) setPersona(data)
  }

  const fetchProgress = async () => {
    const { data } = await supabase
      .from('student_progress')
      .select('*')
      .eq('student_id', student.studentId)
      .eq('session_num', 1)
    if (data) {
      const merged = {}
      data.forEach(d => Object.assign(merged, d.data))
      setProgress(merged)
      if (merged.checked_items) setCheckedItems(merged.checked_items)
      if (merged.selected_item) setSelectedItem(merged.selected_item)
    }
  }

  const fetchPaddletUrl = async () => {
    const { data } = await supabase.from('session').select('paddlet_url').eq('id', 1).single()
    if (data?.paddlet_url) setPaddletUrl(data.paddlet_url)
  }

  const drawPersona = async () => {
    setLoading(true)
    const { data, error } = await supabase.rpc('assign_persona', { p_student_id: student.studentId })
    if (data) setPersona(data)
    setLoading(false)
  }

  const saveProgress = async (field, value) => {
    const newProgress = { ...progress, [field]: value }
    setProgress(newProgress)
    await supabase.from('student_progress').upsert({
      student_id: student.studentId,
      session_num: 1,
      step: session.current_step,
      substep: session.current_substep,
      data: newProgress
    }, { onConflict: 'student_id,session_num' })
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const currentStepData = SESSION1_STEPS[session.current_step]
  const currentSubstepData = currentStepData?.substeps[session.current_substep]

  const getAllDiscomforts = () => {
    return [
      progress.discomfort_1,
      progress.discomfort_2,
      progress.discomfort_3,
      progress.ai_discomfort_1,
      progress.ai_discomfort_2,
      progress.ai_discomfort_3,
      progress.ai_discomfort_4,
      progress.ai_discomfort_5,
    ].filter(Boolean)
  }

  const renderSubstep = () => {
    if (!currentSubstepData) return null
    const { type, instruction, field, placeholder, promptTemplate } = currentSubstepData

    switch (type) {
      case 'info':
        return (
          <div style={styles.infoBox}>
            <p style={styles.infoText}>{instruction}</p>
          </div>
        )

      case 'draw_persona':
        return (
          <div style={styles.infoBox}>
            <p style={styles.infoText}>{instruction}</p>
            {!persona ? (
              <button style={styles.drawButton} onClick={drawPersona} disabled={loading}>
                {loading ? '뽑는 중...' : '🎲 페르소나 뽑기!'}
              </button>
            ) : (
              <div style={styles.personaCard}>
                <img src={persona.image_url} alt={persona.name} style={styles.personaImage} />
                <div style={styles.personaInfo}>
                  <div style={styles.personaName}>{persona.name}</div>
                  <div style={styles.personaAge}>{persona.age} · {persona.job}</div>
                  <div style={styles.personaLocation}>📍 {persona.location}</div>
                  <div style={styles.personaSection}>
                    <span style={styles.sectionLabel}>하루 일과</span>
                    <p style={styles.sectionText}>{persona.daily}</p>
                  </div>
                  <div style={styles.personaSection}>
                    <span style={styles.sectionLabel}>니즈 & 목표</span>
                    <p style={styles.sectionText}>{persona.needs}</p>
                  </div>
                  <div style={styles.personaSection}>
                    <span style={styles.sectionLabel}>행동 패턴</span>
                    <p style={styles.sectionText}>{persona.behavior}</p>
                  </div>
                  <div style={styles.painBox}>
                    <span style={styles.painLabel}>통증 포인트 예시</span>
                    <p style={styles.painText}>{persona.pain}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )

      case 'input':
        return (
          <div style={styles.inputBox}>
            <p style={styles.infoText}>{instruction}</p>
            {persona && (
              <div style={styles.personaMini}>
                <img src={persona.image_url} alt={persona.name} style={styles.personaMiniImage} />
                <span style={styles.personaMiniName}>{persona.name} ({persona.age} {persona.job})</span>
              </div>
            )}
            <textarea
              style={styles.textarea}
              placeholder={placeholder}
              value={progress[field] || ''}
              onChange={e => saveProgress(field, e.target.value)}
              rows={3}
            />
          </div>
        )

      case 'prompt_copy':
        return (
          <div style={styles.promptBox}>
            <p style={styles.infoText}>{instruction}</p>
            <div style={styles.promptTemplate}>
              <pre style={styles.promptText}>{promptTemplate}</pre>
            </div>
            <button style={styles.copyButton} onClick={() => copyToClipboard(promptTemplate)}>
              {copied ? '✅ 복사됨!' : '📋 프롬프트 복사하기'}
            </button>
            <a href="https://claude.ai" target="_blank" rel="noreferrer" style={styles.linkButton}>
              Claude 열기 →
            </a>
          </div>
        )

      case 'checkbox':
        const allItems = getAllDiscomforts()
        return (
          <div style={styles.inputBox}>
            <p style={styles.infoText}>{instruction}</p>
            {allItems.map((item, idx) => (
              <label key={idx} style={styles.checkLabel}>
                <input
                  type="checkbox"
                  checked={checkedItems.includes(item)}
                  onChange={e => {
                    const newChecked = e.target.checked
                      ? [...checkedItems, item]
                      : checkedItems.filter(i => i !== item)
                    setCheckedItems(newChecked)
                    saveProgress('checked_items', newChecked)
                  }}
                  style={styles.checkbox}
                />
                <span style={styles.checkText}>{item}</span>
              </label>
            ))}
          </div>
        )

      case 'radio':
        return (
          <div style={styles.inputBox}>
            <p style={styles.infoText}>{instruction}</p>
            {checkedItems.map((item, idx) => (
              <label key={idx} style={styles.checkLabel}>
                <input
                  type="radio"
                  name="selected_item"
                  value={item}
                  checked={selectedItem === item}
                  onChange={() => {
                    setSelectedItem(item)
                    saveProgress('selected_item', item)
                  }}
                  style={styles.checkbox}
                />
                <span style={styles.checkText}>{item}</span>
              </label>
            ))}
          </div>
        )

      case 'share_copy':
        const shareText = `📌 내가 선택한 문제\n페르소나: ${persona?.name} (${persona?.age} ${persona?.job})\n해결할 문제: ${selectedItem}\n선택 이유: ${progress.reason || ''}`
        return (
          <div style={styles.promptBox}>
            <p style={styles.infoText}>{instruction}</p>
            <div style={styles.promptTemplate}>
              <pre style={styles.promptText}>{shareText}</pre>
            </div>
            <button style={styles.copyButton} onClick={() => copyToClipboard(shareText)}>
              {copied ? '✅ 복사됨!' : '📋 내용 복사하기'}
            </button>
          </div>
        )

      case 'paddlet_link':
        return (
          <div style={styles.infoBox}>
            <p style={styles.infoText}>{instruction}</p>
            {paddletUrl ? (
              <a href={paddletUrl} target="_blank" rel="noreferrer" style={styles.drawButton}>
                패들렛 열기 →
              </a>
            ) : (
              <p style={styles.waitText}>선생님이 패들렛 링크를 열면 버튼이 활성화됩니다</p>
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div style={styles.container}>
      {/* 상단 헤더 */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.studentName}>{student.studentName}</span>
          {persona && <span style={styles.personaBadge}>👤 {persona.name}</span>}
        </div>
        <div style={styles.stepBadge}>
          {currentStepData?.title} · {session.current_substep + 1}/{currentStepData?.substeps.length}
        </div>
      </div>

      {/* 진행 바 */}
      <div style={styles.progressBar}>
        {SESSION1_STEPS.map((s, idx) => (
          <div
            key={idx}
            style={{
              ...styles.progressSegment,
              background: idx < session.current_step ? '#4ECDC4' :
                idx === session.current_step ? '#FF6B6B' : '#e2e8f0'
            }}
          />
        ))}
      </div>

      {/* 메인 콘텐츠 */}
      <div style={styles.content}>
        <div style={styles.stepTitle}>
          <span style={styles.stepNumber}>{session.current_step + 1}</span>
          {currentStepData?.title}
        </div>
        {renderSubstep()}
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#f8fafc',
  },
  header: {
    background: '#fff',
    padding: '16px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  studentName: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1a1a2e',
  },
  personaBadge: {
    background: '#E0F7F5',
    color: '#2BA39A',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600',
  },
  stepBadge: {
    background: '#FF6B6B',
    color: '#fff',
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '700',
  },
  progressBar: {
    display: 'flex',
    gap: '4px',
    padding: '12px 20px',
    background: '#fff',
  },
  progressSegment: {
    flex: 1,
    height: '6px',
    borderRadius: '3px',
    transition: 'background 0.3s',
  },
  content: {
    padding: '20px',
    maxWidth: '680px',
    margin: '0 auto',
  },
  stepTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '20px',
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: '16px',
  },
  stepNumber: {
    background: '#4ECDC4',
    color: '#fff',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: '900',
    flexShrink: 0,
  },
  infoBox: {
    background: '#fff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  },
  infoText: {
    fontSize: '17px',
    lineHeight: '1.7',
    color: '#334155',
    marginBottom: '16px',
  },
  drawButton: {
    display: 'block',
    width: '100%',
    background: '#4ECDC4',
    color: '#fff',
    fontSize: '18px',
    fontWeight: '700',
    padding: '16px',
    borderRadius: '12px',
    textAlign: 'center',
    textDecoration: 'none',
    marginTop: '8px',
  },
  personaCard: {
    marginTop: '16px',
    border: '2px solid #E0F7F5',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  personaImage: {
    width: '100%',
    height: '200px',
    objectFit: 'cover',
  },
  personaInfo: {
    padding: '16px',
  },
  personaName: {
    fontSize: '22px',
    fontWeight: '900',
    color: '#1a1a2e',
  },
  personaAge: {
    fontSize: '15px',
    color: '#64748b',
    marginTop: '4px',
  },
  personaLocation: {
    fontSize: '14px',
    color: '#64748b',
    marginTop: '4px',
    marginBottom: '12px',
  },
  personaSection: {
    marginBottom: '10px',
  },
  sectionLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#4ECDC4',
    letterSpacing: '1px',
    textTransform: 'uppercase',
    display: 'block',
    marginBottom: '4px',
  },
  sectionText: {
    fontSize: '14px',
    color: '#334155',
    lineHeight: '1.6',
  },
  painBox: {
    background: '#FFE5E5',
    borderLeft: '4px solid #FF6B6B',
    padding: '12px',
    borderRadius: '0 8px 8px 0',
    marginTop: '12px',
  },
  painLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#FF6B6B',
    display: 'block',
    marginBottom: '4px',
  },
  painText: {
    fontSize: '14px',
    color: '#334155',
    lineHeight: '1.6',
    fontStyle: 'italic',
  },
  personaMini: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: '#E0F7F5',
    padding: '8px 12px',
    borderRadius: '8px',
    marginBottom: '12px',
  },
  personaMiniImage: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    objectFit: 'cover',
  },
  personaMiniName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#2BA39A',
  },
  inputBox: {
    background: '#fff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  },
  textarea: {
    width: '100%',
    padding: '14px',
    fontSize: '16px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    resize: 'vertical',
    lineHeight: '1.6',
    marginTop: '8px',
  },
  promptBox: {
    background: '#fff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  },
  promptTemplate: {
    background: '#f1f5f9',
    borderRadius: '10px',
    padding: '16px',
    margin: '12px 0',
  },
  promptText: {
    fontSize: '14px',
    lineHeight: '1.8',
    color: '#334155',
    whiteSpace: 'pre-wrap',
    fontFamily: 'inherit',
  },
  copyButton: {
    width: '100%',
    background: '#4ECDC4',
    color: '#fff',
    fontSize: '16px',
    fontWeight: '700',
    padding: '14px',
    borderRadius: '10px',
    marginBottom: '10px',
  },
  linkButton: {
    display: 'block',
    width: '100%',
    background: '#f1f5f9',
    color: '#4ECDC4',
    fontSize: '16px',
    fontWeight: '700',
    padding: '14px',
    borderRadius: '10px',
    textAlign: 'center',
    textDecoration: 'none',
  },
  checkLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '12px',
    background: '#f8fafc',
    borderRadius: '8px',
    marginBottom: '8px',
    cursor: 'pointer',
  },
  checkbox: {
    width: '20px',
    height: '20px',
    marginTop: '2px',
    flexShrink: 0,
    accentColor: '#4ECDC4',
  },
  checkText: {
    fontSize: '15px',
    color: '#334155',
    lineHeight: '1.5',
  },
  waitText: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: '15px',
    padding: '16px',
  },
}
