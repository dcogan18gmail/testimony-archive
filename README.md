# Testimony Archive

An oral history transcription tool that turns audio interviews into searchable, editable, exportable transcripts. Built for researchers working with Holocaust survivor testimonies, but designed to work with any oral history project.

**Live demo:** [testimonyarchive.xyz](https://testimonyarchive.xyz)

## What it does

Upload an audio file and Testimony Archive runs a multi-step pipeline:

1. **Transcribes and translates** the full audio with AssemblyAI (original language + English per utterance, speaker diarization, aligned timestamps)
2. **Identifies speakers** using OpenAI to label speakers beyond generic "Speaker A/B"
3. **Generates a summary** of the interview content

The result is a transcript with synchronized audio playback, editable metadata, speaker management, and DOCX export in three formats (English, original language, or combined).

## Features

- **Google OAuth sign-in** with per-user data isolation (each user sees only their own interviews)
- **Synced audio player** with click-to-seek on any transcript segment
- **Language toggle** between English translation, original language, and combined view
- **Speaker management** with inline rename
- **Editable metadata** (event name, location, interviewer, organization)
- **DOCX export** in three formats with proper document formatting
- **Drag-and-drop upload** with client-side duration probing via ffmpeg.wasm
- **Processing status UI** with real-time step tracking

## Tech stack

- **Framework:** Next.js 16 (App Router)
- **Database:** PostgreSQL via Neon (serverless)
- **ORM:** Drizzle
- **Auth:** Auth.js (next-auth v5) with Google OAuth
- **Storage:** Vercel Blob
- **AI:** AssemblyAI (transcription, translation, diarization), OpenAI GPT-4o Mini (speaker ID, summary)
- **Audio processing:** ffmpeg.wasm (browser-side duration probe)
- **Styling:** Tailwind CSS 4
- **Testing:** Vitest + React Testing Library
- **Export:** docx.js

## Design

The interface follows an editorial design system documented in [DESIGN.md](DESIGN.md). Libre Baskerville headings with Plus Jakarta Sans body text, warm stone neutrals, and minimal decoration. The aesthetic is intentionally reverent for the subject matter while remaining modern and tool-oriented.

## Getting started

### Prerequisites

- Node.js 18+
- A Neon PostgreSQL database
- A Vercel Blob store
- Google Cloud OAuth credentials (client ID and secret)
- OpenAI API key
- AssemblyAI API key

### Setup

```bash
git clone https://github.com/dcogan18gmail/testimony-archive.git
cd testimony-archive
cp .env.example .env.local
# Fill in all env vars in .env.local (see table below)
npm install
npx drizzle-kit push
npm run dev
```

On first visit, you'll sign in with Google. The app then prompts for your OpenAI and AssemblyAI API keys, which are stored in your browser's localStorage (client-side only, never sent to the server for storage).

### Environment variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob storage token |
| `AUTH_SECRET` | Auth.js session secret (generate with `npx auth secret`) |
| `AUTH_URL` | Production URL only (e.g. `https://testimonyarchive.xyz`). Do **not** set this for Preview on Vercel — use `AUTH_TRUST_HOST=true` instead (see below). |
| `AUTH_TRUST_HOST` | Set to `true` for **Preview** deployments on Vercel so Google sign-in stays on the preview URL |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |

### Testing a preview branch on Vercel

`testimonyarchive.xyz` always serves **Production** (`main`). A branch preview uses a `*.vercel.app` URL from the deployment’s **Domains** section — copy that URL exactly (do not use the custom domain).

1. Open the preview deployment in Vercel → **Visit** or copy the `transcription-app-git-…vercel.app` domain.
2. In Vercel → Project → **Settings → Environment Variables**, for **Preview** only: add `AUTH_TRUST_HOST` = `true`. Remove `AUTH_URL` from Preview if it is set.
3. In [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → your OAuth client → **Authorized redirect URIs**, add:
   `https://<your-preview-domain>/api/auth/callback/google`
   (use the full hostname from step 1; redeploy after changing env vars).
4. Sign in on the preview URL. You should see **“Transcribing & translating (AssemblyAI)”** — not separate Whisper + merge steps.

**Easiest local test:** `git checkout feature/assemblyai-unified-transcription && npm run dev` → `http://localhost:3000` (add `http://localhost:3000/api/auth/callback/google` to Google redirect URIs if needed).

### Running tests

```bash
npm test
```

## Project structure

```
src/
├── app/                  # Next.js pages and API routes
│   ├── api/              # REST endpoints
│   └── interviews/[id]/  # Interview detail page
├── components/           # React components
│   ├── AudioPlayer       # Synced audio playback
│   ├── TranscriptView    # Transcript display with language toggle
│   ├── UploadZone        # Drag-and-drop upload
│   └── ...
├── lib/                  # Business logic
│   ├── schema.ts         # Drizzle database schema
│   ├── transcript-segments.ts  # AssemblyAI utterance → segment mapping
│   ├── assemblyai.ts     # AssemblyAI transcription + translation
│   └── ...
└── __tests__/            # Test suite
```

## Planned: AI proofreading and search

The next phase adds intelligence on top of the transcription pipeline. See [EXPANSION_PLAN.md](EXPANSION_PLAN.md) for details:

- **AI transcript proofreading** that recognizes garbled historical place names and proper nouns, suggesting corrections with confidence levels
- **Inline transcript editing** for manual corrections
- **Full-text search** across all interviews using PostgreSQL tsvector
- **Auto-generated entity indexes** (people, places, dates, organizations) per interview

## License

MIT
