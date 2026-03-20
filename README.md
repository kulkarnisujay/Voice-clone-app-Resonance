<div align="center">
  <img src="https://github.com/user-attachments/assets/b82fb99a-9e73-45ab-a46c-c764edcc9df0" alt="Resonance Dashboard" width="100%" />

  <h1>🎙️ Resonance: AI Text-to-Speech Platform</h1>
  <p><strong>A fully free, self-hosted, cutting-edge AI Voice Engine & Web Platform.</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
    <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind" />
    <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
    <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  </p>
</div>

---

## 🌟 Introduction

Welcome to **Resonance**! This project is a completely re-engineered AI Text-to-Speech platform. It's designed to run on a **100% Free Developer Tier**, eliminating the need for expensive GPU rentals, monthly subscriptions, or even a credit card.

Whether you're building a side project, an audiobook generator, or just experimenting with voice AI, Resonance gives you a massive headstart.

---

## ✨ Key Highlights

- **💸 100% Free AI TTS Engine:** Uses a local Python FastAPI server equipped with Microsoft Edge-TTS, replacing costly AI APIs like Modal or ElevenLabs.
- **⚡ Blazing Fast UI:** Built with Next.js 16, React 19, and Tailwind CSS v4 for absolute peak performance.
- **🔐 Seamless Authentication:** Integrated with Clerk's generous free tier for secure, modern user login.
- **🗄️ Serverless Database:** Powered by Neon Postgres—fast, free, and robust.
- **☁️ Cloud Storage:** Utilizes S3-compatible cloud storage via Supabase (Free Tier), making it highly scalable and cheap compared to Cloudflare R2.
- **🔓 Unrestricted:** We've completely bypassed the original restrictive billing integrations—generate as much audio as you want!

---

## 🛠️ Tech Stack Transformation

Here's how we've architected a premium service with zero running costs:

| Component | Industry Standard (Paid) | **Resonance Stack (100% Free)** |
| :--- | :--- | :--- |
| **TTS Engine** | Chatterbox + Modal (A10G GPU) | `edge-tts` (Local FastAPI Server) |
| **Database** | Paid Postgres Instances | Neon Serverless Postgres |
| **Storage (S3)** | AWS S3 / Cloudflare R2 | Supabase Storage |
| **Authentication**| Custom Roll / Paid Auth0 | Clerk (Free Tier) |
| **Billing Gates** | Polar.sh or Stripe Required | Completely Bypassed 🚀 |

---

## 🚀 Getting Started

Since Resonance leverages a high-performance frontend and a dedicated Python AI server, you'll need to run two separate processes locally.

### 📋 Prerequisites
- **Node.js** (v20+)
- **Python** (v3.10+)

### ⚙️ 1. Environment Configuration

Rename the `.env.example` file to `.env` in the root directory and fill in your free-tier credentials:

```env
# Clerk (Auth)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Neon (Database)
DATABASE_URL=postgresql://neondb_owner:...

# Supabase (Storage) -> Ensure S3 is enabled in settings!
R2_ENDPOINT=https://your-project.supabase.co/storage/v1/s3
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=resonance-audio

# Local TTS Server
CHATTERBOX_API_KEY=resonance-local-dev-key
CHATTERBOX_API_URL=http://localhost:8000
```

---

### 🌐 2. Start the Master Frontend (Next.js)

Open a terminal in the root directory:

```bash
# Install Node dependencies
npm install

# Setup your Neon database schema and seed the default voices
npx prisma migrate deploy
npx prisma db seed

# Fire up the Web App
npm run dev
```

---

### 🧠 3. Start the AI Engine (FastAPI)

Open a **second terminal** in the root directory:

```bash
# Create a virtual environment and initialize it
python -m venv .venv

# Activate it
.\.venv\Scripts\Activate.ps1   # Windows
# source .venv/bin/activate    # Mac/Linux

# Install the Python dependencies (FastAPI, up-to-date Pyre2 compatibles)
pip install fastapi uvicorn edge-tts pydantic

# Launch the TTS Brain
python local_tts_server.py
```

🎉 **You are ready!** Visit **[http://localhost:3000](http://localhost:3000)** to dive into your personal, fully unlocked AI Voice Studio!

---

## 💡 Important Notes on AI Capabilities

To bypass expensive GPU processing, Resonance's Python server uses **Microsoft Edge-TTS** under the hood. 

- **🚫 Voice Cloning Limitation:** Because Edge-TTS is a purely neural text-to-speech network, it does not support one-shot voice cloning from audio files (`.wav`).
- **🛡️ Graceful Fallbacks:** If you attempt to upload a custom voice clone, the database will safely index it. However, the generator will gracefully fall back to a beautiful, studio-quality native neural voice (matching the requested accent/language) when asked to synthesize speech.

---

<div align="center">
  <p>🛠️ <i>Maintained and curated with ❤️ by <a href="https://github.com/kulkarnisujay">Sujay Kulkarni</a></i></p>
  <p><b>Star ⭐ this repository if you found it useful!</b></p>
</div>
