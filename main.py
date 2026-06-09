"""Radio Caption API — FastAPI 서버 진입점."""

import asyncio
import logging
import threading

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.pipeline.runner import run_stream

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="Radio Caption API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",   # Create React App / Next.js
        "http://localhost:5173",   # Vite
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# 데이터 모델
# ---------------------------------------------------------------------------

class Channel(BaseModel):
    id: str
    name: str
    url: str


# ---------------------------------------------------------------------------
# 채널 목록
# ---------------------------------------------------------------------------

_CHANNELS: list[Channel] = [
    Channel(
        id="kbs1",
        name="KBS 1라디오",
        url="http://kbs-radio1-live.cdn.cloudn.net/kbs-radio1-live/master.m3u8",
    ),
    Channel(
        id="kbs_coolfm",
        name="KBS 쿨FM",
        url="http://kbs-coolfm-live.cdn.cloudn.net/kbs-coolfm-live/master.m3u8",
    ),
    Channel(
        id="kbs_classicfm",
        name="KBS 클래식FM",
        url="http://kbs-classicfm-live.cdn.cloudn.net/kbs-classicfm-live/master.m3u8",
    ),
    Channel(
        id="mbc_fm4u",
        name="MBC FM4U",
        url="https://cprog-fm.imbc.com/FM4UFMAAC",
    ),
    Channel(
        id="mbc_sfm",
        name="MBC 표준FM",
        url="https://cprog-am.imbc.com/SFMFMAAC",
    ),
    Channel(
        id="sbs_powerfm",
        name="SBS Power FM",
        url="https://aac-pf.sbs.co.kr/audiostream/powerFM",
    ),
    Channel(
        id="sbs_lovefm",
        name="SBS Love FM",
        url="https://aac-pf.sbs.co.kr/audiostream/loveFM",
    ),
    Channel(
        id="ebs_fm",
        name="EBS FM",
        url="https://ebsradio.ebs.co.kr/EBSFM/playlist.m3u8",
    ),
]


# ---------------------------------------------------------------------------
# REST 엔드포인트
# ---------------------------------------------------------------------------

@app.get("/api/channels", response_model=list[Channel])
async def get_channels() -> list[Channel]:
    """한국 주요 라디오 채널 목록을 반환한다."""
    return _CHANNELS


# ---------------------------------------------------------------------------
# WebSocket 엔드포인트
# ---------------------------------------------------------------------------

@app.websocket("/ws/stream")
async def ws_stream(websocket: WebSocket) -> None:
    """라디오 스트림 URL을 받아 실시간 자막(Sentence JSON)을 전송한다.

    프로토콜:
        1. 클라이언트 → 서버: 스트림 URL 문자열 전송
        2. 서버 → 클라이언트: Sentence dict를 JSON으로 반복 전송
        3. 클라이언트가 연결을 끊으면 스트리밍을 중단한다.
    """
    await websocket.accept()

    try:
        url: str = await websocket.receive_text()
    except WebSocketDisconnect:
        return

    logger.info("스트리밍 시작: %s", url)

    loop = asyncio.get_running_loop()
    # maxsize: 소비 속도보다 생산이 빠를 때 배압(backpressure) 적용
    queue: asyncio.Queue[dict | None] = asyncio.Queue(maxsize=8)
    stop_event = threading.Event()

    def _produce() -> None:
        """run_stream 제너레이터를 별도 스레드에서 실행해 queue에 적재한다."""
        try:
            for sentence in run_stream(url):
                if stop_event.is_set():
                    break
                future = asyncio.run_coroutine_threadsafe(queue.put(sentence), loop)
                # 1초 단위로 stop_event를 확인하며 큐 여유를 기다린다
                while not stop_event.is_set():
                    try:
                        future.result(timeout=1.0)
                        break
                    except TimeoutError:
                        continue
                    except Exception as exc:
                        logger.error("큐 적재 오류: %s", exc)
                        return
        except Exception as exc:
            logger.error("스트리밍 파이프라인 오류: %s", exc)
        finally:
            # None은 소비자에게 스트림 종료를 알리는 sentinel
            asyncio.run_coroutine_threadsafe(queue.put(None), loop)

    producer_task = loop.run_in_executor(None, _produce)

    try:
        while True:
            item: dict | None = await queue.get()
            if item is None:
                break
            await websocket.send_json(item)
    except WebSocketDisconnect:
        logger.info("클라이언트 연결 종료: %s", url)
    finally:
        stop_event.set()

    try:
        await asyncio.wait_for(producer_task, timeout=5.0)
    except asyncio.TimeoutError:
        logger.warning("프로듀서 스레드 종료 대기 시간 초과")


# ---------------------------------------------------------------------------
# 진입점
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
