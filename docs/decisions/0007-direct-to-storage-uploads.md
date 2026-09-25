# ADR 0007 — Files upload straight to storage when picked, and AI skills read them from there

## Status
Accepted

## Context
Files used to travel as base64 inside server-action calls: once to generate
fields (before the record was saved) and again to save the record. That hit
two limits before any AI provider was involved — Next.js caps server-action
bodies at 1 MB by default and Vercel caps request bodies at ~4.5 MB — so
audio/video (and larger images/PDFs) failed, and transcription in particular
never worked. The AI layer also only understood images and PDFs, and URL
fields were sent to the model as a bare string it cannot browse.

The question was whether an asset must be *saved* before a skill can process
it.

## Decision
- When a file is picked in the new-record form, the browser uploads it
  directly to the private `archive` bucket using a one-time signed upload
  token minted by a server action (`createUploadTargetsAction`). The record
  itself is still only created on "Save to archive"; saving just attaches the
  already-uploaded path.
- Generation reads every file source from storage by path
  (`resolveSourceFile` in `archive/new/actions.ts`), for both the create and
  edit flows. No file bytes pass through a server action.
- The browser also generates a JPEG preview (max 800 px) for images and
  videos and uploads it beside the file (`<id>.thumb.jpg`); its path is kept in
  the file value's `value_jsonb.thumbPath`. No schema change.
- Files replaced or removed before saving are deleted
  (`discardStagedFilesAction`). Deleting a record now removes its file(s) and
  thumbnail.
- `runFieldGeneration` routes by source and model: audio/video →
  transcription model (`audio.transcriptions`, OpenAI only; see below for
  how large files are handled);
  images/PDFs → chat models (PDFs now work with OpenAI as well as Anthropic);
  a mismatch (e.g. audio with a chat model) is an explicit error. Transcription
  models are recognised by id (`isTranscriptionModel`).
- `url` source fields are fetched server-side (`fetchPageText`) and passed as
  text, with basic SSRF protection (http/https only, private addresses
  refused, redirects re-checked).

## Rationale
Uploading on pick removes the "save first" step without changing what "saved"
means, keeps the app server out of the data path, and makes previews possible
immediately. Storage is the single place file bytes live, so create and edit
share one code path.

## Consequences
- Abandoned forms (tab closed after picking a file) leave orphaned files in
  storage; there is no sweeper yet.
- Uploads need `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the browser and are limited
  by the bucket/project upload size limit set in Supabase.
- Audio/video is never loaded into memory. The source is passed as a signed
  URL and `transcribeMedia` (`src/lib/ai/client.ts`) has ffmpeg read it
  directly, extract the audio as 16 kHz mono mp3 and cut it into 20-minute
  pieces (`src/lib/media/audio.ts`, ~5 MB each). Pieces are transcribed three at
  a time and joined in order, which sidesteps OpenAI's 25 MB file limit and the
  ~23-minute duration limit. A diarizing model labels speakers per piece, so
  labels aren't guaranteed consistent across pieces.
- ffmpeg comes from the `ffmpeg-static` npm package (its binary is downloaded
  on `npm install`, so the platform that builds is the one that runs).
  `next.config.ts` keeps it external and force-includes it in the archive
  routes' serverless bundle. It runs inside the server action, so total time is
  bounded by the page's `maxDuration` (300 s); very long recordings may exceed
  that and would need a background job.
- Upload size is limited by the Supabase project's global storage limit
  (Dashboard → Storage → Settings), not by the app.
- URL reading covers static HTML only; JavaScript-rendered pages return
  little text.
- Word/Excel/other document formats are still unsupported as sources.

## Alternatives considered
- **Raise the server-action body limit:** doesn't help on Vercel (~4.5 MB) and
  still double-handles the bytes.
- **Explicit "upload" or "save" button before generating:** adds a step for no
  benefit once uploads are direct.
- **Upload only on save, generate from the browser's copy:** forces the bytes
  through a server action again.
