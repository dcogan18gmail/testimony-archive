# Testimony Archive

An oral history transcription tool that turns audio interviews into searchable, editable, exportable transcripts. Built for researchers working with Holocaust survivor testimonies, but designed to work with any oral history project.

**Live demo:** [testimonyarchive.xyz](https://testimonyarchive.xyz)

## What it does

Upload an audio file and Testimony Archive runs a multi-step pipeline:

1. **Transcribes** the audio using OpenAI Whisper (handles non-English audio with translation)
2. **Cross-references** with AssemblyAI for speaker diarization (who said what)
3. **Merges** both transcript sources into a unified, speaker-labeled transcript
4. **Identifies speakers** using AI to label speakers beyond generic "Speaker A/B"
5. **Generates a summary** of the interview content

The result is a transcript with synchronized audio playback, editable metadata, speaker management, and DOCX export in three formats (English, original language, or combined).

## Features

- **Google OAuth sign-in** with per-user data isolation (each user sees only their own interviews)
- **Synced audio player** with click-to-seek on any transcript segment
- **Language toggle** between English translation, original language, and combined view
- **Speaker management** with inline rename
- **Editable metadata** (event name, location, interviewer, organization)
- **DOCX export** in three formats with proper document formatting
- **Drag-and-drop upload** with client-side audio chunking via ffmpeg.wasm
- **Processing status UI** with real-time step tracking

## Tech stack

- **Framework:** Next.js 16 (App Router)
- **Database:** PostgreSQL via Neon (serverless)
- **ORM:** Drizzle
- **Auth:** Auth.js (next-auth v5) with Google OAuth
- **Storage:** Vercel Blob
- **AI:** OpenAI API (Whisper, GPT-4o Mini), AssemblyAI
- **Audio processing:** ffmpeg.wasm (browser-side chunking)
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
| `AUTH_URL` | Production URL (e.g. `https://testimonyarchive.xyz`) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |

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
│   ├── UploadZone        # Drag-and-drop upload with chunking
│   └── ...
├── lib/                  # Business logic
│   ├── schema.ts         # Drizzle database schema
│   ├── merge.ts          # Transcript merging algorithm
│   ├── whisper.ts        # OpenAI Whisper integration
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
