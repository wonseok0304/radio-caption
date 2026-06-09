"""Radio Caption API — FastAPI 서버 진입점."""

import asyncio
import logging
import threading

import requests as req
import uvicorn
from fastapi import FastAPI, Query, WebSocket, WebSocketDisconnect
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
    Channel(id="kbs_classic",  name="KBS 클래식FM",    url="https://radio.bsod.kr/stream/?stn=kbs&ch=1fm"),
    Channel(id="kbs_coolfm",   name="KBS 쿨FM",        url="https://radio.bsod.kr/stream/?stn=kbs&ch=2fm"),
    Channel(id="kbs_1radio",   name="KBS 1라디오",     url="https://radio.bsod.kr/stream/?stn=kbs&ch=1radio"),
    Channel(id="kbs_happyfm",  name="KBS 해피FM",      url="https://radio.bsod.kr/stream/?stn=kbs&ch=2radio&bora=true"),
    Channel(id="mbc_fm4u",     name="MBC FM4U",        url="https://radio.bsod.kr/stream/?stn=mbc&ch=chm"),
    Channel(id="cbs_musicfm",  name="CBS 음악FM",      url="https://m-aac.cbs.co.kr/mweb_cbs939/_definst_/cbs939.stream/playlist.m3u8"),
    Channel(id="ytn_radio",    name="YTN 라디오",      url="https://radiolive.ytn.co.kr/radio/_definst_/20211118_fmlive/playlist.m3u8"),
    Channel(id="tbs_fm",       name="TBS FM 95.1",     url="https://cdnfm.tbs.seoul.kr/tbs/_definst_/tbs_fm_web_360.smil/chunklist.m3u8"),
    Channel(id="obs_radio",    name="OBS 라디오",      url="https://vod3.obs.co.kr:444/live/obsstream1/radio.stream/playlist.m3u8"),
    Channel(id="arirang",      name="Arirang Radio",   url="http://amdlive.ctnd.com.edgesuite.net/arirang_3ch/smil:arirang_3ch.smil/playlist.m3u8"),
]


# ---------------------------------------------------------------------------
# REST 엔드포인트
# ---------------------------------------------------------------------------

@app.get("/api/channels", response_model=list[Channel])
async def get_channels() -> list[Channel]:
    """한국 주요 라디오 채널 목록을 반환한다."""
    return _CHANNELS


@app.get("/api/channels/search", response_model=list[Channel])
async def search_channels(
    q: str = Query(default=""),
    tag: str = Query(default=""),
    language: str = Query(default=""),
) -> list[Channel]:
    """Radio Browser API로 한국 라디오 채널을 검색한다.

    q, tag, language 중 입력된 값만 API 파라미터에 포함된다.
    세 값이 모두 비어있으면 빈 목록을 반환한다.
    """
    if not any([q.strip(), tag.strip(), language.strip()]):
        return []
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        None, _fetch_radio_browser, q.strip(), tag.strip(), language.strip()
    )


def _fetch_radio_browser(q: str, tag: str, language: str) -> list[Channel]:
    """Radio Browser API를 동기 호출하고 Channel 목록으로 변환한다."""
    params: dict = {
        "countrycode": "KR",
        "hidebroken": "true",
        "limit": 20,
        "order": "votes",
    }
    if q:
        params["name"] = q
    if tag:
        params["tag"] = tag
    if language:
        params["language"] = language

    try:
        resp = req.get(
            "https://de1.api.radio-browser.info/json/stations/search",
            params=params,
            headers={"User-Agent": "radio-caption/0.1"},
            timeout=10,
        )
        resp.raise_for_status()
        return [
            Channel(
                id=s["stationuuid"],
                name=s["name"].strip(),
                url=s.get("url_resolved") or s["url"],
            )
            for s in resp.json()
            if s.get("url_resolved") or s.get("url")
        ]
    except Exception as exc:
        logger.warning("Radio Browser API 오류: %s", exc)
        return []


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
