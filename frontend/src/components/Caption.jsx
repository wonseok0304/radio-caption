import { useEffect, useRef } from 'react'

/** emotion → 글자 색상 */
const EMOTION_COLOR = {
  joy:     '#FBBF24',  // amber-400
  anger:   '#F87171',  // red-400
  sadness: '#60A5FA',  // blue-400
  neutral: '#FFFFFF',  // white
}

/** volume_level 1~5 → font-size 16~40px (선형 보간) */
function toFontSize(level) {
  return 16 + (level - 1) * 6  // 16 22 28 34 40
}

/** volume_level 1~5 → font-weight 300~700 (Roboto Flex 가변축) */
function toFontWeight(level) {
  return 300 + (level - 1) * 100  // 300 400 500 600 700
}

/** 최근 몇 개 문장을 화면에 표시할지 */
const MAX_SENTENCES = 3

/**
 * @param {{
 *   word: string,
 *   emotion: string,
 *   volume_level: number,
 *   pitch_level: number,
 * }} word
 * @param {boolean} isCurrent  현재(최신) 문장 소속 여부
 * @param {boolean} isLastWord 문장 내 마지막 단어 여부 (강조 글로우)
 */
function Word({ word, isCurrent, isLastWord }) {
  const color = EMOTION_COLOR[word.emotion] ?? EMOTION_COLOR.neutral
  const fontSize = toFontSize(word.volume_level)
  const fontWeight = toFontWeight(word.volume_level)

  return (
    <span
      style={{
        fontFamily: "'Roboto Flex', sans-serif",
        fontVariationSettings: `'wght' ${fontWeight}`,
        fontSize: `${fontSize}px`,
        color,
        // 마지막 단어: 현재 발화 중임을 나타내는 글로우
        textShadow: isLastWord ? `0 0 18px ${color}88` : 'none',
        transition: 'color 0.3s ease, text-shadow 0.3s ease',
        lineHeight: 1.3,
      }}
      className="inline-block mx-[3px]"
    >
      {word.word}
    </span>
  )
}

/**
 * sentences 배열을 받아 자막을 렌더링하는 컴포넌트.
 *
 * - 최근 MAX_SENTENCES개 문장만 표시
 * - 최신 문장: 완전 불투명 / 이전 문장: 단계적으로 흐려짐
 * - 최신 문장의 마지막 단어: 글로우 강조
 *
 * @param {{ sentences: Array<Object> }} props
 */
export default function Caption({ sentences }) {
  const bottomRef = useRef(null)

  // 새 문장이 추가될 때마다 스크롤 내리기
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [sentences.length])

  if (sentences.length === 0) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <p className="text-white/20 text-base tracking-wide select-none">
          채널을 선택하면 자막이 표시됩니다
        </p>
      </div>
    )
  }

  const visible = sentences.slice(-MAX_SENTENCES)

  return (
    <div className="w-full flex flex-col items-center gap-3 px-8 pb-12">
      {visible.map((sentence, idx) => {
        const isCurrent = idx === visible.length - 1
        // 오래된 문장일수록 더 흐리게: 0.15 → 0.45 → 1.0
        const opacity = isCurrent ? 1 : 0.15 + idx * 0.15

        return (
          <div
            key={sentence.sentence_id}
            className="text-center leading-relaxed"
            style={{
              opacity,
              transition: 'opacity 0.4s ease',
              filter: isCurrent ? 'none' : 'blur(0.5px)',
            }}
          >
            {sentence.words.map((word, wordIdx) => (
              <Word
                key={`${sentence.sentence_id}-${wordIdx}`}
                word={word}
                isCurrent={isCurrent}
                isLastWord={isCurrent && wordIdx === sentence.words.length - 1}
              />
            ))}
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}
