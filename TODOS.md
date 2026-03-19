# TODOS

## Server-side blob URL verification
**What:** Add onUploadCompleted callback to verify blob URLs server-side before trusting client-submitted URLs in POST /api/interviews.
**Why:** Currently the client tells the server "I uploaded a file to this URL" and the server trusts it. If auth is ever added, this becomes an attack vector (fake URLs, other users' files).
**Context:** Vercel Blob's handleUpload has an onUploadCompleted callback that fires after upload finishes. It could set a "verified" flag or store the blob URL server-side, then POST /api/interviews cross-checks against it. The callback doesn't fire on localhost (needs ngrok), so the verification would need a bypass for local dev.
**Depends on:** Nothing. Can be added anytime. Becomes more important if user auth is added.
**Priority:** Low — app is currently open-access with no auth.
