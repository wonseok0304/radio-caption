import { useEffect, useRef, useState } from 'react'

export default function Caption({ sentences }) {
  const scrollRef = useRef(null)
  const autoScrollRef = useRef(true)
  const [userScrolling, setUserScrolling] = useState(false)
  const [summarizing, setSummarizing] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [summary, setSummary] = useState('')

  const pastSentences = sentences.length > 1 ? sentences.slice(0, -1) : []
  const currentSentence = sentences.length > 0 ? sentences[sentences.length - 1] : null

  function onScroll() {
    const el = scrollRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 30
    autoScrollRef.current = atBottom
    setUserScrolling(!atBottom)
  }

  useEffect(() => {
    if (autoScrollRef.current) {
      const el = scrollRef.current
      if (el) el.scrollTop = el.scrollHeight
    }
  }, [pastSentences.length])

  function scrollToBottom() {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
    autoScrollRef.current = true
    setUserScrolling(false)
  }

  async function handleSummarize() {
    setSummarizing(true)
    try {
      const resp = await fetch('http://localhost:8000/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentences: sentences.map(s => ({ text: s.text })) }),
      })
      const data = await resp.json()
      setSummary(data.summary)
    } catch {
      setSummary('요약 중 오류가 발생했습니다.')
    } finally {
      setSummarizing(false)
      setShowModal(true)
    }
  }

  const canSummarize = sentences.length >= 5 && !summarizing

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>

      {/* 윗부분: 이전 자막 스크롤 영역 */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        style={{ flex: 1, overflowY: 'scroll', minHeight: 0 }}
      >
        {/* 스페이서 — 자막이 적을 때 아래 정렬 */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
          <div style={{ flexGrow: 1 }} />
          {pastSentences.map((sentence, index) => {
            const isLastPast = index === pastSentences.length - 1
            return (
              <p
                key={sentence.sentence_id}
                style={{
                  margin: 0,
                  padding: '4px 24px',
                  fontSize: '18px',
                  fontWeight: 400,
                  opacity: isLastPast ? 0.7 : 0.45,
                  color: '#ffffff',
                  textAlign: 'center',
                  lineHeight: 1.5,
                }}
              >
                {sentence.words.map((w) => w.word).join(' ')}
              </p>
            )
          })}
        </div>
      </div>

      {/* 구분선 */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }} />

      {/* 아랫부분: 현재 자막 고정 영역 */}
      <div
        style={{
          height: '100px',
          flexShrink: 0,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* 버튼 그룹 */}
        <div style={{ position: 'absolute', top: '8px', right: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          {userScrolling && (
            <button
              onClick={scrollToBottom}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                border: '1px solid rgba(255,255,255,0.3)',
                backgroundColor: 'rgba(0,0,0,0.65)',
                color: '#ffffff',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
              }}
            >
              ↓
            </button>
          )}
          <button
            onClick={handleSummarize}
            disabled={!canSummarize}
            style={{
              height: '28px',
              padding: '0 10px',
              borderRadius: '14px',
              border: '1px solid rgba(255,255,255,0.3)',
              backgroundColor: 'rgba(0,0,0,0.65)',
              color: canSummarize ? '#ffffff' : 'rgba(255,255,255,0.3)',
              fontSize: '13px',
              cursor: canSummarize ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              lineHeight: 1,
              whiteSpace: 'nowrap',
            }}
          >
            {summarizing ? '요약 중...' : '📋 지금까지 요약'}
          </button>
        </div>

        {currentSentence ? (
          <p
            style={{
              margin: 0,
              padding: '16px 24px',
              fontSize: '28px',
              fontWeight: 500,
              opacity: 1,
              color: '#ffffff',
              textAlign: 'center',
              lineHeight: 1.5,
            }}
          >
            {currentSentence.words.map((w) => w.word).join(' ')}
          </p>
        ) : (
          <p
            style={{
              margin: 0,
              padding: '16px 24px',
              fontSize: '16px',
              color: 'rgba(255,255,255,0.2)',
              textAlign: 'center',
            }}
          >
            채널을 선택하면 자막이 표시됩니다
          </p>
        )}
      </div>

      {/* 요약 모달 */}
      {showModal && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          <div
            style={{
              backgroundColor: '#1c1c1e',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '80%',
              width: '400px',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <h3 style={{ margin: '0 0 16px', color: '#ffffff', fontSize: '17px', fontWeight: 600 }}>
              지금까지 요약
            </h3>
            <div
              style={{
                color: 'rgba(255,255,255,0.82)',
                fontSize: '15px',
                lineHeight: 1.7,
                whiteSpace: 'pre-line',
              }}
            >
              {summary}
            </div>
            <button
              onClick={() => setShowModal(false)}
              style={{
                marginTop: '20px',
                padding: '7px 20px',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.25)',
                backgroundColor: 'rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.8)',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              닫기
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
