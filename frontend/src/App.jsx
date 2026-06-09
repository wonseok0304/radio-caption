import { useState, useRef, useCallback } from 'react'
import RadioSelector from './components/RadioSelector'
import Caption from './components/Caption'
import { useWebSocket } from './hooks/useWebSocket'

const STATUS_DOT = {
  idle:         'bg-gray-600',
  connecting:   'bg-yellow-400 animate-pulse',
  connected:    'bg-green-400 animate-pulse',
  disconnected: 'bg-gray-500',
  error:        'bg-red-500',
}

const STATUS_LABEL = {
  idle:         '채널을 선택하세요',
  connecting:   '연결 중…',
  connected:    '수신 중',
  disconnected: '연결 종료됨',
  error:        '연결 오류',
}

export default function App() {
  const [selectedChannel, setSelectedChannel] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(0.8)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const audioRef = useRef(/** @type {HTMLAudioElement | null} */ (null))
  const { sentences, status, error, connect, disconnect } = useWebSocket()

  const startAudio = useCallback((url) => {
    const audio = audioRef.current
    if (!audio) return
    audio.src = url
    audio.volume = volume
    audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false))
  }, [volume])

  const stopAudio = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.src = ''
    setIsPlaying(false)
  }, [])

  function handleChannelSelect(channel) {
    if (selectedChannel?.id === channel.id && status === 'connected') {
      stopAudio()
      disconnect()
      setSelectedChannel(null)
      return
    }
    stopAudio()
    setSelectedChannel(channel)
    startAudio(channel.url)
    connect(channel.url)
  }

  function handlePlayPause() {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => {})
    }
  }

  function handleVolumeChange(e) {
    const val = parseFloat(e.target.value)
    setVolume(val)
    if (audioRef.current) audioRef.current.volume = val
  }

  return (
    <div className="h-screen bg-gray-950 flex overflow-hidden select-none">
      <audio
        ref={audioRef}
        onEnded={() => setIsPlaying(false)}
        onError={() => setIsPlaying(false)}
      />

      {/* ── 왼쪽 패널 (30%) ───────────────────────────── */}
      {sidebarOpen ? (
        <aside className="w-[30%] flex-shrink-0 flex flex-col border-r border-white/10 min-w-0 relative">
          {/* 최소화 버튼 */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute top-4 right-3 z-10 w-6 h-6 flex items-center justify-center text-white/25 hover:text-white/60 transition-colors text-xs"
            aria-label="패널 닫기"
          >
            〈
          </button>
          <RadioSelector
            selectedId={selectedChannel?.id ?? null}
            onSelect={handleChannelSelect}
            disabled={status === 'connecting'}
          />
        </aside>
      ) : (
        /* 패널 닫힌 상태: 얇은 버튼 스트립 */
        <div className="flex-shrink-0 w-8 flex flex-col items-center pt-4 border-r border-white/10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-6 h-6 flex items-center justify-center text-white/25 hover:text-white/60 transition-colors text-xs"
            aria-label="패널 열기"
          >
            〉
          </button>
        </div>
      )}

      {/* ── 오른쪽 패널 (70% 또는 전체) ──────────────── */}
      <main className="flex-1 flex flex-col min-w-0">

        {/* 상단 바: 채널명 + 상태 + 오디오 컨트롤 */}
        <div className="flex-shrink-0 flex items-center justify-between px-8 py-4 border-b border-white/10 gap-4">
          {/* 채널명 + 연결 상태 */}
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[status]}`} />
            <span className="text-white text-sm font-medium truncate">
              {selectedChannel ? selectedChannel.name : STATUS_LABEL[status]}
            </span>
            {selectedChannel && (
              <span className="text-white/30 text-xs flex-shrink-0">
                {STATUS_LABEL[status]}
              </span>
            )}
          </div>

          {/* 오디오 컨트롤 */}
          {selectedChannel && (
            <div className="flex items-center gap-4 flex-shrink-0">
              {/* 재생/정지 */}
              <button
                onClick={handlePlayPause}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                aria-label={isPlaying ? '정지' : '재생'}
              >
                {isPlaying ? (
                  <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                )}
              </button>

              {/* 볼륨 슬라이더 */}
              <div className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-white/30 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                </svg>
                <input
                  type="range" min="0" max="1" step="0.05" value={volume}
                  onChange={handleVolumeChange}
                  className="w-24 accent-white cursor-pointer"
                  aria-label="볼륨"
                />
                <svg className="w-3.5 h-3.5 text-white/30 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                </svg>
              </div>
            </div>
          )}

          {error && <p className="text-red-400/70 text-xs">{error}</p>}
        </div>

        {/* 자막 영역 */}
        <div className="flex-1 overflow-hidden">
          <Caption sentences={sentences} />
        </div>
      </main>
    </div>
  )
}
