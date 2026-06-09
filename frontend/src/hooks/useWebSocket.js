import { useState, useEffect, useRef, useCallback } from 'react'

const WS_URL = 'ws://localhost:8000/ws/stream'

/**
 * @typedef {'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'} ConnectionStatus
 */

/**
 * 라디오 스트림 WebSocket 연결을 관리하는 훅.
 *
 * 사용법:
 *   const { sentences, status, error, connect, disconnect } = useWebSocket()
 *   connect('http://stream-url')  // URL 전송 → Sentence JSON 수신 시작
 *   disconnect()                  // 연결 종료 + sentences 초기화
 *
 * @returns {{
 *   sentences: Array<Object>,
 *   status: ConnectionStatus,
 *   error: string | null,
 *   connect: (streamUrl: string) => void,
 *   disconnect: () => void,
 * }}
 */
export function useWebSocket() {
  const [sentences, setSentences] = useState([])
  const [status, setStatus] = useState(/** @type {ConnectionStatus} */ ('idle'))
  const [error, setError] = useState(/** @type {string | null} */ (null))

  const wsRef = useRef(/** @type {WebSocket | null} */ (null))

  /** 기존 소켓을 조용히 닫는다 (이벤트 핸들러를 먼저 제거해 상태 변경 방지). */
  const _closeQuietly = useCallback(() => {
    const ws = wsRef.current
    if (!ws) return
    ws.onopen = null
    ws.onmessage = null
    ws.onerror = null
    ws.onclose = null
    ws.close()
    wsRef.current = null
  }, [])

  const connect = useCallback(
    (/** @type {string} */ streamUrl) => {
      _closeQuietly()
      setSentences([])
      setError(null)
      setStatus('connecting')

      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        setStatus('connected')
        ws.send(streamUrl)
      }

      ws.onmessage = (event) => {
        try {
          const sentence = JSON.parse(event.data)
          setSentences((prev) => [...prev, sentence])
        } catch {
          // 파싱 실패는 조용히 무시 (서버 로그에서 추적)
        }
      }

      ws.onerror = () => {
        setError('서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인하세요.')
        setStatus('error')
      }

      ws.onclose = () => {
        setStatus((prev) => (prev === 'error' ? prev : 'disconnected'))
      }
    },
    [_closeQuietly],
  )

  const disconnect = useCallback(() => {
    _closeQuietly()
    setStatus('idle')
    setSentences([])
    setError(null)
  }, [_closeQuietly])

  // 컴포넌트 언마운트 시 연결 정리
  useEffect(() => {
    return () => _closeQuietly()
  }, [_closeQuietly])

  return { sentences, status, error, connect, disconnect }
}
