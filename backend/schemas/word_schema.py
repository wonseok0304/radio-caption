"""Pydantic models for CIG — 모든 모듈이 공유하는 핵심 데이터 스키마."""

from typing import Literal, Optional

from pydantic import BaseModel, Field


class Word(BaseModel):
    word: str
    timestamp_start: float
    timestamp_end: float
    emotion: Optional[Literal["joy", "sadness", "anger", "neutral"]] = "neutral"
    volume_level: int = Field(..., ge=1, le=5)
    pitch_level: int = Field(..., ge=1, le=5)


class Sentence(BaseModel):
    sentence_id: int
    speaker: str
    text: str
    words: list[Word]
