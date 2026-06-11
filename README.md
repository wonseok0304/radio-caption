# Radio Caption 🎙️

> 라디오 스트리밍을 실시간으로 자막 생성해주는 웹 서비스
> 청각 장애인을 위한 배리어프리 라디오 자막 시스템

---

## 프로젝트 소개

Radio Caption은 라디오 스트림 URL을 입력받아 faster-whisper로 실시간 STT 변환 후, WebSocket으로 React 프론트엔드에 자막을 전송하는 웹 애플리케이션입니다. 모든 AI 처리는 로컬에서 실행되어 비용이 들지 않습니다.

### 주요 기능
- 🎵 국내 주요 라디오 채널 실시간 자막 생성 (KBS, MBC, SBS, TBS, YTN 등)
- 🔍 Radio Browser API 기반 채널 검색 (장르, 언어 필터)
- 🔗 스트림 URL 직접 입력 지원
- 📜 자막 히스토리 스크롤
- 📋 지금까지 요약 기능 (Ollama llama3)
- 🔊 라디오 오디오 + 자막 동시 제공
- 📱 채널 패널 최소화/확장

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| 백엔드 | FastAPI, WebSocket, uvicorn |
| STT | faster-whisper (로컬, 비용 0원) |
| 음향 분석 | Librosa |
| LLM 요약 | Ollama + llama3:latest (로컬, 비용 0원) |
| 프론트엔드 | React, Tailwind CSS |
| 라디오 수신 | ffmpeg |

---

## 사전 준비

아래 소프트웨어를 먼저 설치해주세요.

### 1. Python 3.10 이상
```
https://python.org 에서 다운로드
```

### 2. Node.js 18 이상
```
https://nodejs.org 에서 LTS 버전 다운로드
```

### 3. ffmpeg
```
https://ffmpeg.org/download.html 에서 Windows 빌드 다운로드
압축 해제 후 C:\ffmpeg\bin 에 배치
시스템 환경변수 Path에 C:\ffmpeg\bin 추가
```

### 4. Ollama
```
https://ollama.com 에서 다운로드 후 설치
```

---

## 설치 및 실행

### 1. 레포지토리 클론

```bash
git clone https://github.com/wonseok0304/radio-caption.git
cd radio-caption
```

### 2. 환경변수 설정

```bash
cp .env.example .env
```

`.env` 파일을 열어서 필요한 값 확인:

```
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3:latest
WHISPER_MODEL_SIZE=base
RADIO_CHUNK_SECONDS=6
DATA_DIR=./data
OUTPUT_DIR=./data/outputs
```

### 3. Python 패키지 설치

```bash
pip install fastapi uvicorn[standard] websockets faster-whisper librosa ollama pydantic python-dotenv requests ffmpeg-python soundfile numpy
```

### 4. Ollama 모델 다운로드 (최초 1회, 약 4GB)

```bash
ollama pull llama3
```

### 5. 프론트엔드 패키지 설치

```bash
cd frontend
npm install
cd ..
```

---

## 실행 방법

터미널을 **3개** 열어서 각각 실행합니다.

### 터미널 1 — Ollama 서버

```bash
ollama serve
```

### 터미널 2 — 백엔드 서버

```bash
cd radio-caption
python main.py
```

아래 메시지가 뜨면 성공:
```
INFO: Uvicorn running on http://0.0.0.0:8000
INFO: Application startup complete.
```

### 터미널 3 — 프론트엔드 서버

```bash
cd radio-caption/frontend
npm run dev
```

아래 메시지가 뜨면 성공:
```
VITE v5.4.x  ready in xxx ms
➜  Local:   http://localhost:5173/
```

### 브라우저에서 접속

```
http://localhost:5173
```

---

## 사용 방법

1. 브라우저에서 `http://localhost:5173` 접속
2. 왼쪽 채널 목록에서 원하는 채널 클릭
3. 약 3~5초 후 자막이 화면에 표시됨
4. 상단 오디오 플레이어로 라디오 소리도 들을 수 있음
5. **지금까지 요약** 버튼으로 현재까지 내용 요약 가능
6. 이전 자막은 위로 스크롤해서 확인 가능

---

## 채널 검색

- 검색창에 채널명 입력 (예: KBS, MBC)
- 장르 필터: kpop, pop, classical, news, talk, jazz
- 언어 필터: korean, english
- **URL 직접 입력**: 원하는 스트림 URL 직접 입력 가능

---

## 트러블슈팅

### 자막이 안 나올 때
- 백엔드 터미널 에러 확인
- ffmpeg 설치 및 PATH 등록 확인: `ffmpeg -version`
- 채널 URL이 유효한지 확인

### 요약 기능 오류
- Ollama 서버 실행 확인: `ollama serve`
- 모델 설치 확인: `ollama list`
- llama3 없으면 설치: `ollama pull llama3`

### 프론트엔드 실행 오류
```bash
cd frontend
Remove-Item -Recurse -Force node_modules  # Windows
npm install
npm run dev
```

### 포트 충돌
- 백엔드 기본 포트: 8000
- 프론트엔드 기본 포트: 5173
- 다른 프로그램이 해당 포트를 사용 중이면 충돌 발생

---

## 외부 공유 (ngrok)

같은 와이파이가 아닌 외부에서 접속하게 하려면 ngrok을 사용하세요.

```bash
# ngrok 설치 후
ngrok http 5173
```

생성된 `https://xxxx.ngrok-free.app` 주소로 누구나 접속 가능합니다.

---

## 프로젝트 구조

```
radio-caption/
├── main.py                      # FastAPI 진입점
├── CLAUDE.md                    # Claude Code 컨텍스트
├── pyproject.toml               # Python 의존성
├── .env.example                 # 환경변수 예시
├── backend/
│   ├── schemas/word_schema.py   # Pydantic 모델
│   ├── stt/transcriber.py       # faster-whisper STT
│   ├── audio/analyzer.py        # Librosa 음향 분석
│   ├── llm/emotion_tagger.py    # Ollama 감정 추론
│   └── pipeline/
│       ├── runner.py            # 통합 파이프라인
│       └── stream.py            # 라디오 청크 수신
└── frontend/
    └── src/
        ├── App.jsx              # 메인 레이아웃
        ├── components/
        │   ├── Caption.jsx      # 자막 렌더링
        │   ├── RadioSelector.jsx # 채널 선택
        │   └── StatusBar.jsx    # 연결 상태
        └── hooks/
            └── useWebSocket.js  # WebSocket 관리
```

---

## 팀원

IT융합학부 컴퓨터 정보·보안 전공 — 식스맨
