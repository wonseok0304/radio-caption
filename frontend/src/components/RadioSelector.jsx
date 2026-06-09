import { useState, useEffect } from 'react'

const API_URL = 'http://localhost:8000/api/channels'

/**
 * @param {{
 *   onSelect: (channel: {id: string, name: string, url: string}) => void,
 *   selectedId: string | null,
 *   disabled: boolean,
 * }} props
 */
export default function RadioSelector({ onSelect, selectedId, disabled }) {
  const [channels, setChannels] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)

  useEffect(() => {
    fetch(API_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`채널 목록 요청 실패 (${res.status})`)
        return res.json()
      })
      .then((data) => {
        setChannels(data)
        setLoading(false)
      })
      .catch((err) => {
        setFetchError(err.message)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <p className="text-white/40 text-sm animate-pulse">채널 목록 불러오는 중…</p>
  }

  if (fetchError) {
    return <p className="text-red-400 text-sm">{fetchError}</p>
  }

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {channels.map((channel) => {
        const isSelected = selectedId === channel.id
        return (
          <button
            key={channel.id}
            onClick={() => onSelect(channel)}
            disabled={disabled && !isSelected}
            className={[
              'px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
              isSelected
                ? 'bg-white text-black shadow-lg shadow-white/20'
                : 'bg-white/10 text-white/80 hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed',
            ].join(' ')}
          >
            {channel.name}
          </button>
        )
      })}
    </div>
  )
}
