# TODOS

## Server-side blob URL verification
**What:** Add onUploadCompleted callback to verify blob URLs server-side before trusting client-submitted URLs in POST /api/interviews.
**Why:** Currently the client tells the server "I uploaded a file to this URL" and the server trusts it. If auth is ever added, this becomes an attack vector (fake URLs, other users' files).
**Context:** Vercel Blob's handleUpload has an onUploadCompleted callback that fires after upload finishes. It could set a "verified" flag or store the blob URL server-side, then POST /api/interviews cross-checks against it. The callback doesn't fire on localhost (needs ngrok), so the verification would need a bypass for local dev.
**Depends on:** Nothing. Can be added anytime. Becomes more important if user auth is added.
**Priority:** Low — app is currently open-access with no auth.

## Pipeline state persistence for cross-session resume
**What:** Save each pipeline step's result to the DB as it completes, so the pipeline can resume from a fresh page load if the user closes the tab mid-processing.
**Why:** The client orchestrator holds pipeline state in React state. If the tab closes during AssemblyAI polling or Whisper processing, progress is lost. The audio is safe in Blob and AssemblyAI keeps processing server-side, but the client can't reconnect to that in-flight work.
**Context:** The interviews table already has `status` and `currentStep` columns. This TODO would add: (1) save Whisper segments to a new DB column after Step 1 completes, (2) save AssemblyAI transcript ID so the client can re-poll, (3) on page load, check DB for in-progress interviews and resume from last completed step. Adds ~2 small API endpoints.
**Depends on:** Phase 3 (transcription pipeline) must be working first.
**Priority:** Medium — improves reliability for long recordings but users can re-upload as a workaround.
