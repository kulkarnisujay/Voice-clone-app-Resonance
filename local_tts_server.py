"""
Local TTS Server — Free replacement for the Modal/Chatterbox TTS engine.
Uses Microsoft Edge TTS (edge-tts) — completely free, no API key, no GPU needed.

Install:  pip install fastapi uvicorn edge-tts
Run:      uvicorn local_tts_server:app --host 0.0.0.0 --port 8000 --reload
"""

import asyncio
import io
import os

import edge_tts
import uvicorn
from fastapi import Depends, FastAPI, HTTPException, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, Field

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
# Language → Edge TTS voice mapping
# Covers the 5 locales used by the 20 built-in Resonance voices
# ---------------------------------------------------------------------------
LANG_VOICE_MAP: dict[str, str] = {
    "en-US": "en-US-AriaNeural",
    "en-GB": "en-GB-SoniaNeural",
    "en-IN": "en-IN-NeerjaNeural",
    "en-AU": "en-AU-NatashaNeural",
    "ru-RU": "ru-RU-SvetlanaNeural",
}
DEFAULT_VOICE = "en-US-AriaNeural"

def pick_edge_voice(voice_key: str) -> str:
    """
    Extract language hint from voice_key path (e.g. 'voices/system/abc123').
    Falls back to DEFAULT_VOICE — edge-tts ignores the cloning concept since
    it's a neural TTS service, not a voice cloning model.
    """
    for lang_code, edge_voice in LANG_VOICE_MAP.items():
        if lang_code.lower() in voice_key.lower():
            return edge_voice
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
    print(f"[DEBUG] Prompt: '{request.prompt[:50]}...'")
    print(f"[DEBUG] Target Voice/Language Key: {request.voice_key}")
    edge_voice = pick_edge_voice(request.voice_key)

    try:
        communicate = edge_tts.Communicate(text=request.prompt, voice=edge_voice)
        audio_buffer = io.BytesIO()

        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_buffer.write(chunk["data"])

        audio_buffer.seek(0)

        if audio_buffer.getbuffer().nbytes == 0:
            raise HTTPException(status_code=500, detail="TTS returned empty audio")

        return StreamingResponse(audio_buffer, media_type="audio/mpeg")

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {exc}") from exc


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"\n✅ Local TTS server starting on http://localhost:{port}")
    print(f"   Docs:   http://localhost:{port}/docs")
    print(f"   Health: http://localhost:{port}/health\n")
    uvicorn.run("local_tts_server:app", host="0.0.0.0", port=port, reload=True)
