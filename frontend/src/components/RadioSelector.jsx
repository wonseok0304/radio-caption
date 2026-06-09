import { useState, useEffect, useRef } from 'react'

const API_BASE = 'http://localhost:8000/api'

const TAG_OPTIONS = [
  { value: '',          label: '전체' },
  { value: 'kpop',      label: 'K-POP' },
  { value: 'pop',       label: 'POP' },
  { value: 'classical', label: '클래식' },
  { value: 'news',      label: '뉴스' },
  { value: 'talk',      label: '토크' },
  { value: 'jazz',      label: 'Jazz' },
]

const LANG_OPTIONS = [
  { value: '',        label: '전체' },
  { value: 'korean',  label: '한국어' },
  { value: 'english', label: 'English' },
]

const SELECT_CLS = [
  'flex-1 bg-white/5 text-white/60 text-xs rounded px-2 py-1.5',
  'outline-none focus:ring-1 focus:ring-white/20 cursor-pointer transition-all',
  '[&>option]:bg-gray-900',
].join(' ')

/** 사이드바 채널 아이템 */
function ChannelItem({ channel, isSelected, disabled, onSelect }) {
  return (
    <button
      onClick={() => onSelect(channel)}
      disabled={disabled && !isSelected}
      className={[
        'relative w-full text-left px-4 py-2.5 text-sm transition-all duration-150',
        isSelected
          ? 'text-white bg-white/10'
          : 'text-white/45 hover:text-white/75 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed',
      ].join(' ')}
    >
      {/* 선택된 채널 왼쪽 강조 바 */}
      <span
        className={[
          'absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full transition-all',
          isSelected ? 'bg-white' : 'bg-transparent',
        ].join(' ')}
      />
      <span className="pl-1">{channel.name}</span>
    </button>
  )
}

/** 채널 섹션 구분 레이블 */
function SectionLabel({ children }) {
  return (
    <p className="px-4 pt-3 pb-1 text-[10px] font-semibold tracking-widest uppercase text-white/20">
      {children}
    </p>
  )
}

/**
 * 왼쪽 사이드바 패널 — 로고, 검색, 필터, 채널 리스트, URL 직접 입력
 *
 * @param {{
 *   onSelect: (channel: {id: string, name: string, url: string}) => void,
 *   selectedId: string | null,
 *   disabled: boolean,
 * }} props
 */
export default function RadioSelector({ onSelect, selectedId, disabled }) {
  // ── 프리셋 ──────────────────────────────────────────────
  const [presets, setPresets] = useState([])
  const [presetsLoading, setPresetsLoading] = useState(true)

  // ── 검색 필터 ──────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
  const [selectedLang, setSelectedLang] = useState('')

  // ── 검색 결과 ──────────────────────────────────────────
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  // ── URL 직접 입력 ──────────────────────────────────────
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [customUrl, setCustomUrl] = useState('')
  const urlInputRef = useRef(null)

  // 프리셋 로드
  useEffect(() => {
    fetch(`${API_BASE}/channels`)
      .then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then((data) => { setPresets(data); setPresetsLoading(false) })
      .catch(() => setPresetsLoading(false))
  }, [])

  // 검색 필터 변경 시 300ms 디바운스
  useEffect(() => {
    const hasFilter = searchQuery.trim() || selectedTag || selectedLang
    if (!hasFilter) {
      setSearchResults([])
      setHasSearched(false)
      return
    }

    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const params = new URLSearchParams()
        if (searchQuery.trim()) params.set('q', searchQuery.trim())
        if (selectedTag)        params.set('tag', selectedTag)
        if (selectedLang)       params.set('language', selectedLang)

        const res = await fetch(`${API_BASE}/channels/search?${params}`)
        if (!res.ok) throw new Error()
        setSearchResults(await res.json())
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
        setHasSearched(true)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, selectedTag, selectedLang])

  // URL 입력창 토글 시 자동 포커스
  useEffect(() => {
    if (showUrlInput) urlInputRef.current?.focus()
  }, [showUrlInput])

  function handleCustomPlay() {
    const url = customUrl.trim()
    if (!url) return
    onSelect({ id: 'custom', name: '직접 입력', url })
    setCustomUrl('')
    setShowUrlInput(false)
  }

  function handleUrlKeyDown(e) {
    if (e.key === 'Enter') handleCustomPlay()
    if (e.key === 'Escape') setShowUrlInput(false)
  }

  return (
    <div className="h-full flex flex-col">

      {/* ── 고정 상단: 로고 + 검색 + 필터 ───────────────── */}
      <div className="flex-shrink-0 px-4 pt-5 pb-3 flex flex-col gap-3">
        {/* 로고 */}
        <h1 className="text-white/25 text-[10px] font-semibold tracking-[0.35em] uppercase">
          Radio Caption
        </h1>

        {/* 검색창 */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="채널 검색..."
            className="w-full bg-white/5 text-white text-xs placeholder-white/25 rounded px-3 py-2 outline-none focus:ring-1 focus:ring-white/20 transition-all"
          />
          {searching && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/25 text-[10px] animate-pulse">
              검색 중
            </span>
          )}
        </div>

        {/* 필터 드롭다운 */}
        <div className="flex gap-2">
          <select value={selectedTag} onChange={(e) => setSelectedTag(e.target.value)} className={SELECT_CLS}>
            {TAG_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={selectedLang} onChange={(e) => setSelectedLang(e.target.value)} className={SELECT_CLS}>
            {LANG_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <hr className="border-white/10 flex-shrink-0" />

      {/* ── 스크롤 채널 목록 ──────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {/* 프리셋 채널 */}
        {presetsLoading ? (
          <p className="px-4 py-3 text-xs text-white/25 animate-pulse">불러오는 중…</p>
        ) : (
          <>
            {presets.length > 0 && <SectionLabel>즐겨찾기</SectionLabel>}
            {presets.map((ch) => (
              <ChannelItem
                key={ch.id}
                channel={ch}
                isSelected={selectedId === ch.id}
                disabled={disabled}
                onSelect={onSelect}
              />
            ))}
          </>
        )}

        {/* 검색 결과 */}
        {hasSearched && (
          <>
            <SectionLabel>검색 결과</SectionLabel>
            {searchResults.length > 0 ? (
              searchResults.map((ch) => (
                <ChannelItem
                  key={ch.id}
                  channel={ch}
                  isSelected={selectedId === ch.id}
                  disabled={disabled}
                  onSelect={onSelect}
                />
              ))
            ) : (
              !searching && (
                <p className="px-4 py-2 text-xs text-white/25">검색 결과가 없습니다</p>
              )
            )}
          </>
        )}
      </div>

      {/* ── 고정 하단: URL 직접 입력 ──────────────────────── */}
      <div className="flex-shrink-0 border-t border-white/10">
        <button
          onClick={() => setShowUrlInput((v) => !v)}
          className="w-full px-4 py-3 text-left text-xs text-white/30 hover:text-white/55 transition-colors flex items-center gap-2"
        >
          <span>{showUrlInput ? '▲' : '▼'}</span>
          <span>URL 직접 입력</span>
        </button>

        {showUrlInput && (
          <div className="px-3 pb-3 flex gap-2">
            <input
              ref={urlInputRef}
              type="url"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              onKeyDown={handleUrlKeyDown}
              placeholder="https://..."
              className="flex-1 min-w-0 bg-white/5 text-white text-xs placeholder-white/25 rounded px-3 py-2 outline-none focus:ring-1 focus:ring-white/20 transition-all"
            />
            <button
              onClick={handleCustomPlay}
              disabled={!customUrl.trim()}
              className="px-3 py-2 rounded text-xs font-medium bg-white/10 text-white/70 hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0"
            >
              재생
            </button>
          </div>
        )}
      </div>

    </div>
  )
}
