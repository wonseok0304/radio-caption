import { useState } from 'react'
import RadioSelector from './components/RadioSelector'
import Caption from './components/Caption'
import { useWebSocket } from './hooks/useWebSocket'

const STATUS_LABEL = {
  idle:         '채널을 선택하세요',
  connecting:   '연결 중…',
  connected:    '수신 중',
  disconnected: '연결 종료됨',
  error:        '연결 오류',
}

const STATUS_DOT = {
  idle:         'bg-gray-600',
  connecting:   'bg-yellow-400 animate-pulse',
  connected:    'bg-green-400 animate-pulse',
  disconnected: 'bg-gray-500',
  error:        'bg-red-500',
}

export default function App() {
  const [selectedChannel, setSelectedChannel] = useState(null)
  const { sentences, status, error, connect, disconnect } = useWebSocket()

  function handleChannelSelect(channel) {
    // 이미 선택된 채널을 다시 누르면 → 연결 해제
    if (selectedChannel?.id === channel.id && status === 'connected') {
      disconnect()
      setSelectedChannel(null)
      return
    }
    setSelectedChannel(channel)
    connect(channel.url)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col select-none">
      {/* 상단 컨트롤 영역 */}
      <header className="flex flex-col items-center gap-4 px-6 pt-8 pb-6">
        <h1 className="text-white/30 text-xs font-semibold tracking-[0.3em] uppercase">
          Radio Caption
        </h1>

        <RadioSelector
          onSelect={handleChannelSelect}
          selectedId={selectedChannel?.id ?? null}
          disabled={status === 'connecting'}
        />

        {/* 연결 상태 표시 */}
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${STATUS_DOT[status]}`} />
          <span className="text-xs text-white/40">
            {status === 'connected' && selectedChannel
              ? `${selectedChannel.name} ${STATUS_LABEL.connected}`
              : STATUS_LABEL[status]}
          </span>
        </div>

        {error && (
          <p className="text-red-400/80 text-xs max-w-sm text-center">{error}</p>
        )}
      </header>

      {/* 자막 영역 — 화면 하단을 기준으로 쌓임 */}
      <main className="flex-1 flex flex-col justify-end overflow-hidden">
        <Caption sentences={sentences} />
      </main>
    </div>
  )
}
