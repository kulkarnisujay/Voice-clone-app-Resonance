# 🎙️ Resonance: AI Text-to-Speech Platform (Fully Free Stack)

Welcome to the **Resonance Clone** codebase! This project has been fully re-engineered from its original structure to operate on a **100% Free Developer Tier** using cutting-edge open-source tools and free APIs.

You do not need a single credit card, expensive GPU rental, or monthly software subscription to run this application!

![Resonance Dashboard](https://github.com/user-attachments/assets/b82fb99a-9e73-45ab-a46c-c764edcc9df0)

---

## ✨ Features
- **100% Free AI TTS Engine:** Powered by a local Python Edge-TTS server instead of an expensive rented Modal/Chatterbox GPU.
- **Dynamic Next.js 16 Frontend:** Blazing fast React 19 UI with Tailwind CSS v4.
- **User Authentication:** Fully integrated Clerk Auth (Free Tier).
- **Postgres Database:** Serverless Postgres via Neon Tech (Free Tier).
- **Audio Storage:** S3-compatible cloud bucket storage via Supabase (Free Tier) rather than Cloudflare R2.
- **Bypassed Subscriptions:** The mandatory Polar billing integrations from the original repo have been completely decoupled so you can generate audio for free.

---

## 🛠️ The Tech Stack

| Component | Original Service (Paid) | New Service (100% Free) |
| :--- | :--- | :--- |
| **TTS Engine** | Chatterbox + Modal (A10G GPU) | `edge-tts` (Local FastAPI Server) |
| **Database** | Prisma Postgres | Neon Postgres |
| **Storage (S3)** | Cloudflare R2 | Supabase Storage |
| **Authentication**| Clerk | Clerk |
| **Billing Gates** | Polar.sh Required | Bypassed / Optional |

---

## 🚀 How to Run Locally

Because of the architectural changes, this project requires **two separate processes** to operate: The Next.js frontend and the FastAPI Python TTS generator.

### 1. Prerequisites
- **Node.js** (v20+)
- **Python** (v3.10+)

### 2. Environment Variables
Rename the `.env.example` file to `.env` (or create one) and configure these services by making free accounts on their respective websites:

```env
# Clerk (Auth)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Neon (Database)
DATABASE_URL=postgresql://neondb_owner:...

# Supabase (Storage) -> Enable S3 in settings!
R2_ENDPOINT=https://your-project.supabase.co/storage/v1/s3
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=resonance-audio

# Local TTS Server
CHATTERBOX_API_KEY=resonance-local-dev-key
CHATTERBOX_API_URL=http://localhost:8000
```

### 3. Start the Next.js Frontend
Open a terminal in the root directory and run:
```bash
# Install Node dependencies
npm install

# Setup your Neon database and seed standard voices
npx prisma migrate deploy
npx prisma db seed

# Start the Web App
npm run dev
```

### 4. Start the Free Python TTS Engine
Open a **second terminal** in the root directory and run:
```bash
# Create a virtual environment and install dependencies
python -m venv .venv
.\.venv\Scripts\Activate.ps1   # (Windows)
# source .venv/bin/activate    # (Mac/Linux)

pip install fastapi uvicorn edge-tts pydantic

# Start the TTS server
python local_tts_server.py
```

### 5. Play!
Visit **[http://localhost:3000](http://localhost:3000)** in your browser. You can now log in, view the dashboard, and generate text-to-speech audio permanently for free.

---

## 💡 Notes on Features
Because this repository modifies the upstream API to avoid paying for expensive GPU voice-cloning compute models, the Edge-TTS engine powers the backend.
* **Feature Limit:** True "Voice Cloning" (copying the exact sound of a `.wav` file you upload) is intrinsically disabled by Edge-TTS. 
* **Fallback Behavior:** If you upload a custom audio file, the database will correctly catalog it. However, when generating audio from it, the Python server will gracefully fallback to a high-quality standard Neural voice (such as an American or British accent based on the language tag you selected).

---
*Maintained and curated by [Sujay Kulkarni](https://github.com/kulkarnisujay).*
