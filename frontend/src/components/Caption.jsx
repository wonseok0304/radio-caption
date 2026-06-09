import { useEffect, useRef, useState } from 'react'

export default function Caption({ sentences }) {
  const scrollRef = useRef(null)
  const autoScrollRef = useRef(true)
  const [userScrolling, setUserScrolling] = useState(false)

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

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

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
        {/* 최신 자막으로 버튼 */}
        {userScrolling && (
          <button
            onClick={scrollToBottom}
            style={{
              position: 'absolute',
              top: '8px',
              right: '16px',
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

    </div>
  )
}
