"""
Local TTS Server — Free replacement for the Modal/Chatterbox TTS engine.
Uses Microsoft Edge TTS (edge-tts) — completely free, no API key, no GPU needed.

Install:  pip install fastapi uvicorn edge-tts
Run:      uvicorn local_tts_server:app --host 0.0.0.0 --port 8000 --reload
"""

import asyncio
import io
import os
from dotenv import load_dotenv  # type: ignore

load_dotenv()  # Load environment variables from .env if it exists

from typing import Optional, List, Dict
import edge_tts  # type: ignore
import uvicorn  # type: ignore
from fastapi import Depends, FastAPI, HTTPException, Security  # type: ignore
from fastapi.middleware.cors import CORSMiddleware  # type: ignore
from fastapi.responses import StreamingResponse  # type: ignore
from fastapi.security import APIKeyHeader  # type: ignore
from pydantic import BaseModel, Field  # type: ignore

# ---------------------------------------------------------------------------
# API key auth — mirrors the Chatterbox API contract
# ---------------------------------------------------------------------------
api_key_scheme = APIKeyHeader(name="x-api-key", scheme_name="ApiKeyAuth", auto_error=False)

def verify_api_key(x_api_key: str | None = Security(api_key_scheme)):
    expected = os.environ.get("CHATTERBOX_API_KEY", "")
    if not expected or x_api_key != expected:
        raise HTTPException(status_code=403, detail="Invalid API key")
    return x_api_key

# ---------------------------------------------------------------------------
# Request model — identical fields as the real Chatterbox API
# ---------------------------------------------------------------------------
class TTSRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=5000)
    voice_key: str = Field(..., min_length=1, max_length=300)
    temperature: float = Field(default=0.8, ge=0.0, le=2.0)
    top_p: float = Field(default=0.95, ge=0.0, le=1.0)
    top_k: int = Field(default=1000, ge=1, le=10000)
    repetition_penalty: float = Field(default=1.2, ge=1.0, le=2.0)
    norm_loudness: bool = Field(default=True)

# ---------------------------------------------------------------------------
# Dynamic Voice Matching
# ---------------------------------------------------------------------------
DEFAULT_VOICE = "en-US-AriaNeural"
_voices_manager: Optional[edge_tts.VoicesManager] = None

async def get_voices_manager() -> edge_tts.VoicesManager:
    global _voices_manager
    if _voices_manager is None:
        _voices_manager = await edge_tts.VoicesManager.create()
    return _voices_manager

async def pick_edge_voice(voice_key: str) -> str:
    """
    Extract language hint from voice_key (e.g. 'es-ES_voices/system/abc123').
    Matches the locale against available edge-tts voices.
    """
    # 1. Clean up voice_key and extract potential locale
    # We expect format: "locale_r2path"
    parts = voice_key.split("_", 1)
    target_locale = parts[0] if len(parts) > 1 else ""
    
    print(f"[DEBUG] Matching locale: '{target_locale}'")

    if not target_locale:
        return DEFAULT_VOICE

    manager = await get_voices_manager()
    
    # Try to find an exact match for the locale (e.g. 'en-US')
    # manager is an edge_tts.VoicesManager instance
    locale_voices = manager.find(Locale=target_locale)
    if locale_voices:
        # Return the first available voice for this locale
        return str(locale_voices[0]["ShortName"])

    # If no exact match, try matching just the language part (e.g. 'en' from 'en-GB')
    lang_prefix = target_locale.split("-")[0]
    for v in manager.voices:
        if v["Locale"].startswith(lang_prefix):
            return str(v["ShortName"])

    return DEFAULT_VOICE

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Chatterbox TTS API",
    description="Local free TTS server using Microsoft Edge TTS. Mirrors the Chatterbox API contract.",
    version="1.0.0",
    docs_url="/docs",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok", "engine": "edge-tts"}

@app.get("/")
def root():
    return {"message": "Chatterbox Local TTS Server is running. API docs at /docs"}

@app.get("/openapi.json")
def get_openapi():
    return app.openapi()

@app.post(
    "/generate",
    responses={200: {"content": {"audio/mpeg": {}}}},
    dependencies=[Depends(verify_api_key)],
)
async def generate_speech(request: TTSRequest):
    """
    Generate speech from text using Microsoft Edge TTS.
    Returns MP3 audio (WaveSurfer.js handles MP3 natively).
    Voice cloning is not supported — the language is inferred from voice_key.
    """
    print(f"\n[DEBUG] ➔ Incoming TTS Request")
    print(f"[DEBUG] Prompt: '{request.prompt[:50]}...'")  # type: ignore
    print(f"[DEBUG] Target Voice/Language Key: {request.voice_key}")
    edge_voice = await pick_edge_voice(request.voice_key)

    try:
        communicate = edge_tts.Communicate(text=request.prompt, voice=edge_voice)
        audio_buffer = io.BytesIO()

        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_buffer.write(chunk["data"])

        audio_buffer.seek(0)

        if audio_buffer.getbuffer().nbytes == 0:
            raise HTTPException(
                status_code=400, 
                detail="No audio was received. Please verify that your parameters are correct. (Usually this means the selected voice does not support the language of the prompt text)."
            )

        return StreamingResponse(audio_buffer, media_type="audio/mpeg")

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {exc}") from exc

# ---------------------------------------------------------------------------
# Whisper Transcription
# ---------------------------------------------------------------------------
import whisper
import tempfile
from fastapi import UploadFile, File as FastFile, Form

_whisper_model = None

def get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        print("[DEBUG] Loading Whisper 'small' model (better for Hindi/multilingual)...")
        # 'small' is 244MB, much more accurate for non-English than 'base'
        _whisper_model = whisper.load_model("small")
    return _whisper_model

@app.post(
    "/transcribe",
    dependencies=[Depends(verify_api_key)]
)
async def transcribe_speech(
    file: UploadFile = FastFile(...),
    language: Optional[str] = Form(None)  # Allow optional language hint (e.g. 'hi')
):
    """
    Transcribe uploaded audio file using Whisper.
    Supports many languages and automatically detects it.
    """
    print(f"\n[DEBUG] ➔ Incoming Transcription Request")
    print(f"[DEBUG] File: {file.filename}, Type: {file.content_type}, Hint: {language}")

    try:
        model = get_whisper_model()
        
        # Save uploaded file to a temporary location
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        print(f"[DEBUG] Processing transcription (task=transcribe, language={language or 'auto'})...")
        
        # We explicitly set task="transcribe" to avoid unwanted translation to English
        # We pass the language if provided as a hint
        result = model.transcribe(tmp_path, task="transcribe", language=language)
        
        print(f"[DEBUG] Transcription finished.")
        print(f"[DEBUG] Detected language: {result.get('language')}")
        print(f"[DEBUG] Text: {result['text'][:100]}...")

        # Clean up temp file
        os.unlink(tmp_path)

        return {
            "text": result["text"].strip(),
            "language": result["language"]
        }

    except Exception as exc:
        print(f"[ERR] Transcription failed: {exc}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {exc}") from exc

# ---------------------------------------------------------------------------
# Free Translation
# ---------------------------------------------------------------------------
from deep_translator import GoogleTranslator  # type: ignore

class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    target_lang: str = Field(..., min_length=2, max_length=10) # 'es', 'fr', 'en', etc.

@app.post(
    "/translate",
    dependencies=[Depends(verify_api_key)]
)
async def translate_text(request: TranslateRequest):
    """
    Translate text using Google Translate (free via deep-translator).
    """
    print(f"\n[DEBUG] ➔ Incoming Translation Request")
    print(f"[DEBUG] Target Language: {request.target_lang}")

    try:
        # 'auto' correctly identifies source language automatically
        translated = GoogleTranslator(source='auto', target=request.target_lang).translate(request.text)
        
        return {
            "translated_text": translated,
            "target_lang": request.target_lang
        }

    except Exception as exc:
        print(f"[ERR] Translation failed: {exc}")
        raise HTTPException(status_code=500, detail=f"Translation failed: {exc}") from exc


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"\n✅ Local TTS server starting on http://localhost:{port}")
    print(f"   Docs:   http://localhost:{port}/docs")
    print(f"   Health: http://localhost:{port}/health\n")
    uvicorn.run("local_tts_server:app", host="0.0.0.0", port=port, reload=True)
