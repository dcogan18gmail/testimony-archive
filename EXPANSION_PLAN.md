# Expansion Plan: AI Proofreading, Inline Editing, and Search

Status: Planned (not yet implemented)

## Overview

Testimony Archive currently transcribes oral history interviews and provides playback with synced audio. The next phase adds intelligence: AI-powered correction of garbled historical terms, inline transcript editing, and full-text search across all interviews.

## The Problem

Speech-to-text engines (Whisper, AssemblyAI) handle conversational speech well but regularly garble proper nouns, especially historical place names, camp names, and geographic references. A trained historian can recognize "Terenistat" as "Theresienstadt" by ear, but that creates a bottleneck. The tool should be capable of making these corrections independently, using general world history and geography knowledge.

## Planned Features

### 1. AI Transcript Proofreading

A post-transcription pipeline step that scans each transcript for likely proper nouns (places, people, organizations, dates, historical events) and identifies garbled terms. Corrections are presented as inline suggestions with confidence levels that users accept or dismiss.

- Runs as a new pipeline step after summarization
- Uses gpt-4o with batched processing (50 segments per API call, 5-segment overlap for context continuity)
- Non-blocking: if the API call fails, the transcript is saved as-is and proofreading can be re-triggered
- Subject-matter agnostic: works for any oral history project, not just Holocaust testimonies
- Output format designed for future entity table migration

### 2. Inline Transcript Editing

Click any transcript segment to edit it directly. Changes save back to the database with edit history tracking. Works for AI-suggested corrections and manual fixes alike.

### 3. Full-Text Search

Search across all interviews using PostgreSQL full-text search (tsvector/tsquery with GIN index). Results show matching segments grouped by interview with timestamps and surrounding context. Click a result to jump directly to that segment with audio cued up. Covers transcript text and metadata fields.

### 4. Auto-Generated Interview Index (follow-on)

Display extracted entities (people, places, dates, organizations) as a browsable index on each interview page. Data is generated as a byproduct of the proofreading pass. Each entry links to its first mention in the transcript.

## Architecture Notes

- All proofreading results stored as JSONB (`proofreadingResults` column) for audit trail and future entity migration
- Search uses a `searchText tsvector` column with `simple` text search configuration (language-agnostic)
- Full transcript array replacement for edits (acceptable at current scale, upgradeable to `jsonb_set` if needed)
- No new infrastructure required: stays within the existing Next.js + PostgreSQL + OpenAI stack

## Future Direction

The proofreading output format includes structured entity data (`entities_detected`) designed to migrate into relational entity tables. This enables cross-interview features: "show me every interview that mentions Theresienstadt," entity timelines, and geographic visualization of places mentioned across all interviews.
