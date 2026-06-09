"""라디오 스트림 수신 모듈 — ffmpeg로 URL을 읽어 고정 크기 PCM 청크를 yield한다."""

import os
import subprocess
from collections.abc import Generator

from dotenv import load_dotenv

load_dotenv()

_CHUNK_SECONDS: int = int(os.getenv("RADIO_CHUNK_SECONDS", "3"))
_SAMPLE_RATE: int = 16000
_CHANNELS: int = 1
_BYTES_PER_SAMPLE: int = 2  # 16-bit signed PCM


def stream_radio(url: str) -> Generator[bytes, None, None]:
    """라디오 스트림 URL에서 오디오를 수신해 청크 단위 raw PCM을 yield한다.

    출력 포맷: 16kHz mono 16-bit signed little-endian PCM (s16le)
    청크 크기: RADIO_CHUNK_SECONDS 초 분량 (기본 3초)

    Args:
        url: 라디오 스트림 URL (http/https/rtmp 등 ffmpeg 지원 스킴)

    Yields:
        bytes: RADIO_CHUNK_SECONDS 초 분량의 raw PCM 데이터
              (마지막 청크는 그보다 짧을 수 있음)

    Raises:
        OSError: ffmpeg 실행 파일을 찾을 수 없을 때
        RuntimeError: ffmpeg 프로세스가 비정상 종료됐을 때
    """
    chunk_bytes: int = _CHUNK_SECONDS * _SAMPLE_RATE * _CHANNELS * _BYTES_PER_SAMPLE

    cmd: list[str] = [
        "ffmpeg",
        "-i", url,
        "-ar", str(_SAMPLE_RATE),
        "-ac", str(_CHANNELS),
        "-f", "s16le",
        "-",
    ]

    process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
    )

    try:
        assert process.stdout is not None
        while True:
            chunk: bytes = process.stdout.read(chunk_bytes)
            if not chunk:
                break
            yield chunk
    finally:
        process.terminate()
        process.wait()

    if process.returncode not in (0, -15):  # -15 == SIGTERM (정상 종료)
        raise RuntimeError(f"ffmpeg 프로세스 비정상 종료 (returncode={process.returncode})")
