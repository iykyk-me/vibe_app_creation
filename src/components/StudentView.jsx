import React, { useState, useEffect } from 'react'
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
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    fetchSession()
    const channel = supabase
      .channel('session_changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'session' }, payload => {
        setSession(payload.new)
        if (payload.new.paddlet_url) setPaddletUrl(payload.new.paddlet_url)
        setSubmitted(false)
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  useEffect(() => {
    fetchPersona()
    fetchProgress()
    fetchPaddletUrl()
    checkReset()
    const resetInterval = setInterval(checkReset, 3000)
    return () => clearInterval(resetInterval)
  }, [])

  const fetchSession = async () => {
    const { data } = await supabase.from('session').select('*').eq('id', 1).single()
    if (data) {
      setSession(data)
      if (data.paddlet_url) setPaddletUrl(data.paddlet_url)
    }
  }

  const lastResetRef = React.useRef(null)

  const checkReset = async () => {
    const { data } = await supabase.from('session').select('reset_at').eq('id', 1).single()
    if (!data) return
    if (lastResetRef.current === null) {
      lastResetRef.current = data.reset_at
      return
    }
    if (data.reset_at && data.reset_at !== lastResetRef.current) {
      localStorage.removeItem('student_id')
      localStorage.removeItem('student_number')
      localStorage.removeItem('student_name')
      window.location.reload()
    }
  }

  const fetchPersona = async () => {
    const { data } = await supabase
      .from('personas').select('*')
      .eq('assigned_to', student.studentId).maybeSingle()
    if (data) setPersona(data)
  }

  const fetchProgress = async () => {
    const { data } = await supabase
      .from('student_progress').select('*')
      .eq('student_id', student.studentId).eq('session_num', 1)
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
    const { data } = await supabase.rpc('assign_persona', { p_student_id: student.studentId })
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

  const getAllDiscomforts = () => [
    progress.discomfort_1,
    progress.discomfort_2,
    progress.ai_discomfort_1,
    progress.ai_discomfort_2,
    progress.ai_discomfort_3,
  ].filter(Boolean)

  const currentStepData = SESSION1_STEPS[session.current_step]
  const currentSubstepData = currentStepData?.substeps[session.current_substep]

  const PersonaSideCard = () => {
    if (!persona) return null
    return (
      <div style={s.personaSideCard}>
        <img src={persona.image_url} alt={persona.name} style={s.personaSideImage} />
        <div style={s.personaSideInfo}>
          <div style={s.personaSideName}>{persona.name}</div>
          <div style={s.personaSideAge}>{persona.age} · {persona.job}</div>
          <div style={s.personaSideLocation}>📍 {persona.location}</div>
          <div style={s.painBox}>
            <span style={s.painLabel}>통증 포인트 예시</span>
            <p style={s.painText}>{persona.pain}</p>
          </div>
        </div>
      </div>
    )
  }

  const renderContent = () => {
    if (!currentSubstepData) return null
    const { showPersona } = currentSubstepData

    return (
      <div>
        {showPersona && <PersonaSideCard />}
        {renderBlock(currentSubstepData)}
      </div>
    )
  }

  const renderBlock = (substepData) => {
    const { type, instruction, field, placeholder, promptTemplate } = substepData
    switch (type) {
      case 'info':
        return (
          <div style={s.box}>
            <p style={s.infoText}>{instruction}</p>
          </div>
        )

      case 'draw_persona':
        return (
          <div style={s.box}>
            <p style={s.infoText}>{instruction}</p>
            {!persona ? (
              <button style={s.mintBtn} onClick={drawPersona} disabled={loading}>
                {loading ? '뽑는 중...' : '🎲 페르소나 뽑기!'}
              </button>
            ) : (
              <div style={s.personaCard}>
                <img src={persona.image_url} alt={persona.name} style={s.personaImage} />
                <div style={s.personaInfo}>
                  <div style={s.personaName}>{persona.name}</div>
                  <div style={s.personaAge}>{persona.age} · {persona.job}</div>
                  <div style={s.personaLocation}>📍 {persona.location}</div>
                  {[['하루 일과', persona.daily], ['니즈 & 목표', persona.needs], ['행동 패턴', persona.behavior]].map(([label, text]) => (
                    <div key={label} style={s.section}>
                      <span style={s.sectionLabel}>{label}</span>
                      <p style={s.sectionText}>{text}</p>
                    </div>
                  ))}
                  <div style={s.painBox}>
                    <span style={s.painLabel}>통증 포인트 예시</span>
                    <p style={s.painText}>{persona.pain}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )

      case 'input':
        return (
          <div style={s.box}>
            <p style={s.infoText}>{instruction}</p>
            {submitted ? (
              <div style={s.waitingBox}>
                <div style={s.waitingEmoji}>⏳</div>
                <p style={s.waitingText}>입력 완료!</p>
                <p style={s.waitingSubText}>친구들이 입력을 완료할 때까지 기다려주세요 🙂</p>
                <div style={s.myAnswer}>
                  <span style={s.myAnswerLabel}>내 답변</span>
                  <p style={s.myAnswerText}>{progress[field]}</p>
                </div>
              </div>
            ) : (
              <>
                <textarea
                  style={s.textarea}
                  placeholder={placeholder}
                  value={progress[field] || ''}
                  onChange={e => saveProgress(field, e.target.value)}
                  rows={3}
                />
                <button
                  style={{
                    ...s.mintBtn,
                    background: progress[field] ? '#4ECDC4' : '#cbd5e1',
                    marginTop: '12px',
                    cursor: progress[field] ? 'pointer' : 'not-allowed',
                  }}
                  onClick={() => {
                    if (progress[field]) {
                      saveProgress(`${field}_submitted`, true)
                      setSubmitted(true)
                    }
                  }}
                  disabled={!progress[field]}
                >
                  ✅ 입력 완료
                </button>
              </>
            )}
          </div>
        )

      case 'prompt_copy':
        return (
          <div style={s.box}>
            <p style={s.infoText}>{instruction}</p>
            <div style={s.promptTemplate}>
              <pre style={s.promptText}>{promptTemplate}</pre>
            </div>
            <button style={s.mintBtn} onClick={() => copyToClipboard(promptTemplate)}>
              {copied ? '✅ 복사됨!' : '📋 프롬프트 복사하기'}
            </button>
          </div>
        )

      case 'prompt_copy_ai': {
        // 1단계 프롬프트: 나이/직업 입력, 불편함 자동완성
        // 2단계 프롬프트: 불편함 모두 자동완성
        const isStep1 = session.current_step === 1
        const builtPrompt = isStep1
          ? `너는 언남동에 사는 ${progress.persona_age || '[나이]'}살 ${progress.persona_job || '[직업]'}이야.
내가 찾은 불편함:
- ${progress.discomfort_1 || '[불편함 ①]'}
- ${progress.discomfort_2 || '[불편함 ②]'}
위 내용과 겹치지 않는 불편한 점 3가지를 더 찾아줘.`
          : `너는 언남동에 사는 ${progress.persona_age || '[나이]'}살 ${progress.persona_job || '[직업]'}이야.
아래 불편함 중 스마트폰 앱으로 해결할 수 있는 것과
어려운 것을 구분하고 이유도 알려줘.
- ${progress.discomfort_1 || '[불편함 ①]'}
- ${progress.discomfort_2 || '[불편함 ②]'}
- ${progress.ai_discomfort_1 || ''}
- ${progress.ai_discomfort_2 || ''}
- ${progress.ai_discomfort_3 || ''}`

        return (
          <div style={s.box}>
            <p style={s.infoText}>{instruction}</p>

            {isStep1 && (
              <div style={s.promptInputRow}>
                <div style={s.promptInputGroup}>
                  <label style={s.promptInputLabel}>나이</label>
                  <input
                    style={s.promptInput}
                    placeholder="예) 72"
                    value={progress.persona_age || ''}
                    onChange={e => saveProgress('persona_age', e.target.value)}
                  />
                </div>
                <div style={s.promptInputGroup}>
                  <label style={s.promptInputLabel}>직업</label>
                  <input
                    style={s.promptInput}
                    placeholder="예) 할머니"
                    value={progress.persona_job || ''}
                    onChange={e => saveProgress('persona_job', e.target.value)}
                  />
                </div>
              </div>
            )}

            <div style={s.promptTemplate}>
              <pre style={s.promptText}>{builtPrompt}</pre>
            </div>
            <button style={s.mintBtn} onClick={() => copyToClipboard(builtPrompt)}>
              {copied ? '✅ 복사됨!' : '📋 프롬프트 복사하기'}
            </button>
            <div style={s.aiButtons}>
              {[
                { name: 'Claude', url: 'https://claude.ai', color: '#D97706' },
                { name: 'ChatGPT', url: 'https://chat.openai.com', color: '#10A37F' },
                { name: 'Gemini', url: 'https://gemini.google.com', color: '#4285F4' },
                { name: '뤼튼', url: 'https://wrtn.ai', color: '#6366F1' },
              ].map(ai => (
                <a key={ai.name} href={ai.url} target="_blank" rel="noreferrer"
                  style={{ ...s.aiBtn, background: ai.color }}>
                  {ai.name} 열기
                </a>
              ))}
            </div>
          </div>
        )
      }

      case 'checkbox':
        return (
          <div style={s.box}>
            <p style={s.infoText}>{instruction}</p>
            {getAllDiscomforts().map((item, idx) => (
              <label key={idx} style={s.checkLabel}>
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
                  style={s.checkbox}
                />
                <span style={s.checkText}>{item}</span>
              </label>
            ))}
          </div>
        )

      case 'radio':
        return (
          <div style={s.box}>
            <p style={s.infoText}>{instruction}</p>
            {checkedItems.map((item, idx) => (
              <label key={idx} style={s.checkLabel}>
                <input
                  type="radio"
                  name="selected_item"
                  value={item}
                  checked={selectedItem === item}
                  onChange={() => { setSelectedItem(item); saveProgress('selected_item', item) }}
                  style={s.checkbox}
                />
                <span style={s.checkText}>{item}</span>
              </label>
            ))}
          </div>
        )

      case 'share_copy':
        const shareText = `📌 내가 선택한 문제\n페르소나: ${persona?.name} (${persona?.age} ${persona?.job})\n해결할 문제: ${selectedItem}\n선택 이유: ${progress.reason || ''}`
        return (
          <div style={s.box}>
            <p style={s.infoText}>{instruction}</p>
            <div style={s.promptTemplate}>
              <pre style={s.promptText}>{shareText}</pre>
            </div>
            <button style={s.mintBtn} onClick={() => copyToClipboard(shareText)}>
              {copied ? '✅ 복사됨!' : '📋 내용 복사하기'}
            </button>
          </div>
        )

      case 'paddlet_link':
        return (
          <div style={s.box}>
            <p style={s.infoText}>{instruction}</p>
            {paddletUrl
              ? <a href={paddletUrl} target="_blank" rel="noreferrer" style={s.mintBtn}>패들렛 열기 →</a>
              : <p style={s.waitText}>선생님이 패들렛 링크를 열면 버튼이 활성화됩니다</p>
            }
          </div>
        )

      case 'prompt_editable_ai': {
        const editFields = substepData?.fields || []
        const templateParts = substepData?.templateParts || []

        // 완성된 프롬프트 문자열 생성
        const buildPrompt = () => {
          return templateParts.map(part => {
            if (typeof part === 'string') return part
            if (part.field) return progress[part.field] || `[${part.field}]`
            if (part.auto) return progress[part.auto] || `[${part.auto}]`
            return ''
          }).join('')
        }

        return (
          <div style={s.box}>
            <p style={s.infoText}>{instruction}</p>

            {/* 편집 가능한 입력창 */}
            {editFields.length > 0 && (
              <div style={s.editFieldsRow}>
                {editFields.map(f => (
                  <input
                    key={f.key}
                    style={s.inlineInput}
                    placeholder={f.placeholder}
                    value={progress[f.key] || ''}
                    onChange={e => saveProgress(f.key, e.target.value)}
                  />
                ))}
              </div>
            )}

            {/* 완성된 프롬프트 미리보기 */}
            <div style={s.promptTemplate}>
              <pre style={s.promptText}>{buildPrompt()}</pre>
            </div>

            <button style={s.mintBtn} onClick={() => copyToClipboard(buildPrompt())}>
              {copied ? '✅ 복사됨!' : '📋 프롬프트 복사하기'}
            </button>
            <div style={s.aiButtons}>
              {[
                { name: 'Claude', url: 'https://claude.ai', color: '#D97706' },
                { name: 'ChatGPT', url: 'https://chat.openai.com', color: '#10A37F' },
                { name: 'Gemini', url: 'https://gemini.google.com', color: '#4285F4' },
                { name: '뤼튼', url: 'https://wrtn.ai', color: '#6366F1' },
              ].map(ai => (
                <a key={ai.name} href={ai.url} target="_blank" rel="noreferrer"
                  style={{ ...s.aiBtn, background: ai.color }}>
                  {ai.name} 열기
                </a>
              ))}
            </div>
          </div>
        )
      }

      case 'form_link':
        return (
          <div style={s.box}>
            <p style={s.infoText}>{instruction}</p>
            <a
              href="https://docs.google.com/forms/d/e/1FAIpQLSfMnCqSdQVVhUrIse7Ao3rVnF0aQSzmd2dAzX1qpWUG0Fl6Cw/viewform?usp=dialog"
              target="_blank"
              rel="noreferrer"
              style={{ ...s.mintBtn, background: '#FF6B6B', marginTop: '0' }}
            >
              📝 개발일지 작성하기
            </a>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={s.studentName}>{student.studentName}</span>
          {persona && <span style={s.personaBadge}>👤 {persona.name}</span>}
        </div>
        <div style={s.stepBadge}>
          {currentStepData?.title} · {session.current_substep + 1}/{currentStepData?.substeps.length}
        </div>
      </div>

      <div style={s.progressBar}>
        {SESSION1_STEPS.map((_, idx) => (
          <div key={idx} style={{
            ...s.progressSegment,
            background: idx < session.current_step ? '#4ECDC4' :
              idx === session.current_step ? '#FF6B6B' : '#e2e8f0'
          }} />
        ))}
      </div>

      <div style={s.content}>
        <div style={s.stepTitle}>
          <span style={s.stepNumber}>{session.current_step + 1}</span>
          {currentStepData?.title}
        </div>
        {renderContent()}
      </div>
    </div>
  )
}

const s = {
  container: { minHeight: '100vh', background: '#f8fafc' },
  header: {
    background: '#fff', padding: '16px 20px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)', position: 'sticky', top: 0, zIndex: 100,
  },
  studentName: { fontSize: '16px', fontWeight: '700', color: '#1a1a2e' },
  personaBadge: {
    background: '#E0F7F5', color: '#2BA39A',
    padding: '4px 10px', borderRadius: '20px', fontSize: '13px', fontWeight: '600',
  },
  stepBadge: {
    background: '#FF6B6B', color: '#fff',
    padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '700',
  },
  progressBar: { display: 'flex', gap: '4px', padding: '12px 20px', background: '#fff' },
  progressSegment: { flex: 1, height: '6px', borderRadius: '3px', transition: 'background 0.3s' },
  content: { padding: '20px', maxWidth: '680px', margin: '0 auto' },
  stepTitle: {
    display: 'flex', alignItems: 'center', gap: '10px',
    fontSize: '20px', fontWeight: '900', color: '#1a1a2e', marginBottom: '16px',
  },
  stepNumber: {
    background: '#4ECDC4', color: '#fff', width: '32px', height: '32px',
    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '16px', fontWeight: '900', flexShrink: 0,
  },
  personaSideCard: {
    background: '#fff', borderRadius: '16px', padding: '16px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)', display: 'flex',
    gap: '14px', alignItems: 'flex-start', marginBottom: '12px', border: '2px solid #E0F7F5',
  },
  personaSideImage: { width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 },
  personaSideInfo: { flex: 1 },
  personaSideName: { fontSize: '18px', fontWeight: '900', color: '#1a1a2e' },
  personaSideAge: { fontSize: '13px', color: '#64748b', marginTop: '2px' },
  personaSideLocation: { fontSize: '12px', color: '#64748b', marginBottom: '6px' },
  box: {
    background: '#fff', borderRadius: '16px',
    padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  },
  infoText: { fontSize: '17px', lineHeight: '1.7', color: '#334155', marginBottom: '16px' },
  mintBtn: {
    display: 'block', width: '100%', background: '#4ECDC4', color: '#fff',
    fontSize: '17px', fontWeight: '700', padding: '15px', borderRadius: '12px',
    textAlign: 'center', textDecoration: 'none', marginBottom: '10px', border: 'none', cursor: 'pointer',
  },
  grayBtn: {
    display: 'block', width: '100%', background: '#f1f5f9', color: '#4ECDC4',
    fontSize: '16px', fontWeight: '700', padding: '14px', borderRadius: '10px',
    textAlign: 'center', textDecoration: 'none',
  },
  personaCard: { marginTop: '16px', border: '2px solid #E0F7F5', borderRadius: '12px', overflow: 'hidden' },
  personaImage: { width: '100%', height: '200px', objectFit: 'cover' },
  personaInfo: { padding: '16px' },
  personaName: { fontSize: '22px', fontWeight: '900', color: '#1a1a2e' },
  personaAge: { fontSize: '15px', color: '#64748b', marginTop: '4px' },
  personaLocation: { fontSize: '14px', color: '#64748b', marginTop: '4px', marginBottom: '12px' },
  section: { marginBottom: '10px' },
  sectionLabel: {
    fontSize: '11px', fontWeight: '700', color: '#4ECDC4',
    letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '4px',
  },
  sectionText: { fontSize: '14px', color: '#334155', lineHeight: '1.6' },
  painBox: {
    background: '#FFE5E5', borderLeft: '4px solid #FF6B6B',
    padding: '12px', borderRadius: '0 8px 8px 0', marginTop: '8px',
  },
  painLabel: { fontSize: '11px', fontWeight: '700', color: '#FF6B6B', display: 'block', marginBottom: '4px' },
  painText: { fontSize: '13px', color: '#334155', lineHeight: '1.6', fontStyle: 'italic' },
  textarea: {
    width: '100%', padding: '14px', fontSize: '16px',
    border: '2px solid #e2e8f0', borderRadius: '10px',
    resize: 'vertical', lineHeight: '1.6', marginTop: '8px', fontFamily: 'inherit',
  },
  promptTemplate: { background: '#f1f5f9', borderRadius: '10px', padding: '16px', margin: '12px 0' },
  promptText: { fontSize: '14px', lineHeight: '1.8', color: '#334155', whiteSpace: 'pre-wrap', fontFamily: 'inherit' },
  checkLabel: {
    display: 'flex', alignItems: 'flex-start', gap: '10px',
    padding: '12px', background: '#f8fafc', borderRadius: '8px', marginBottom: '8px', cursor: 'pointer',
  },
  checkbox: { width: '20px', height: '20px', marginTop: '2px', flexShrink: 0, accentColor: '#4ECDC4' },
  checkText: { fontSize: '15px', color: '#334155', lineHeight: '1.5' },
  waitText: { textAlign: 'center', color: '#94a3b8', fontSize: '15px', padding: '16px' },
  waitingBox: {
    background: '#f0fdf9', border: '2px solid #4ECDC4',
    borderRadius: '12px', padding: '24px', textAlign: 'center',
  },
  waitingEmoji: { fontSize: '40px', marginBottom: '8px' },
  waitingText: { fontSize: '20px', fontWeight: '900', color: '#2BA39A', marginBottom: '4px' },
  waitingSubText: { fontSize: '15px', color: '#64748b', marginBottom: '16px' },
  myAnswer: {
    background: '#fff', borderRadius: '10px', padding: '12px',
    textAlign: 'left', border: '1px solid #e2e8f0',
  },
  myAnswerLabel: {
    fontSize: '11px', fontWeight: '700', color: '#4ECDC4',
    display: 'block', marginBottom: '4px',
  },
  myAnswerText: { fontSize: '15px', color: '#334155', lineHeight: '1.6' },
  editFieldsRow: { display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' },
  inlineInput: {
    flex: 1, minWidth: '140px', padding: '10px 14px', fontSize: '16px',
    border: '2px solid #4ECDC4', borderRadius: '10px', fontFamily: 'inherit',
    outline: 'none', background: '#f0fdf9',
  },
  aiButtons: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' },
  personaFillRow: { display: 'flex', gap: '10px', marginBottom: '12px' },
  fillItem: { flex: 1 },
  fillLabel: { fontSize: '12px', fontWeight: '700', color: '#4ECDC4', display: 'block', marginBottom: '4px' },
  fillInput: {
    width: '100%', padding: '10px 12px', fontSize: '15px',
    border: '2px solid #4ECDC4', borderRadius: '8px', fontFamily: 'inherit',
  },
  promptInputRow: { display: 'flex', gap: '12px', marginBottom: '12px' },
  promptInputGroup: { flex: 1 },
  promptInputLabel: { display: 'block', fontSize: '12px', fontWeight: '700', color: '#4ECDC4', marginBottom: '6px' },
  promptInput: {
    width: '100%', padding: '10px 12px', fontSize: '16px',
    border: '2px solid #e2e8f0', borderRadius: '8px', fontFamily: 'inherit',
  },
  aiBtn: {
    display: 'block', color: '#fff', fontSize: '15px', fontWeight: '700',
    padding: '12px', borderRadius: '10px', textAlign: 'center', textDecoration: 'none',
  },
}
