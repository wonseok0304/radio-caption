"""Whisper STT 모듈 — faster-whisper로 raw PCM 청크를 단어 타임스탬프로 변환."""

import logging
import os

import numpy as np
from dotenv import load_dotenv
from faster_whisper import WhisperModel

load_dotenv()

WHISPER_MODEL_SIZE: str = os.getenv("WHISPER_MODEL_SIZE", "base")

logger = logging.getLogger(__name__)

# 모듈 로드 시 한 번만 초기화 — 청크마다 재로드하면 스트리밍 지연이 생긴다
_model: WhisperModel | None = None


def _get_model() -> WhisperModel:
    global _model
    if _model is None:
        _model = WhisperModel(WHISPER_MODEL_SIZE, device="cpu", compute_type="int8")
        logger.info("faster-whisper 모델 로드 완료: %s", WHISPER_MODEL_SIZE)
    return _model


def transcribe_stream(audio_chunk: bytes) -> list[dict]:
    """stream.py에서 yield된 raw PCM bytes를 STT 변환해 단어 타임스탬프 목록을 반환한다.

    입력 포맷: 16kHz mono 16-bit signed little-endian PCM (stream.py의 출력과 동일)
    반환값은 Word 스키마의 STT 필드만 포함한다.
    emotion / volume_level / pitch_level 은 후속 파이프라인 단계에서 채워진다.

    Args:
        audio_chunk: stream_radio()가 yield한 s16le raw PCM bytes

    Returns:
        [{"word": str, "timestamp_start": float, "timestamp_end": float}, ...]

    Raises:
        ValueError: audio_chunk가 비어있을 때
    """
    if not audio_chunk:
        raise ValueError("audio_chunk가 비어있습니다")

    # s16le bytes → float32 ndarray [-1.0, 1.0]
    audio_np: np.ndarray = (
        np.frombuffer(audio_chunk, dtype=np.int16).astype(np.float32) / 32768.0
    )

    segments, _ = _get_model().transcribe(
        audio_np,
        language="ko",
        word_timestamps=True,
        beam_size=1,
    )

    words: list[dict] = []
    for segment in segments:
        for w in segment.words or []:
            words.append(
                {
                    "word": w.word.strip(),
                    "timestamp_start": round(w.start, 4),
                    "timestamp_end": round(w.end, 4),
                }
            )

    logger.info("STT 완료: %d개 단어 (%d bytes 입력)", len(words), len(audio_chunk))
    return words
