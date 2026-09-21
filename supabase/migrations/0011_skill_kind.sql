-- A skill now has a "kind": which job it does, and therefore which provider API
-- is called. 'chat' = text/vision generation (the default, and what every skill
-- did before); 'transcription' = speech-to-text on an audio/video file.
--
-- Previously the app guessed "transcription" from the model's name. Existing
-- skills whose model name matches are backfilled so they keep working.

alter table ampersand.ai_skills
  add column if not exists kind text not null default 'chat'
    check (kind in ('chat', 'transcription'));

update ampersand.ai_skills
  set kind = 'transcription'
  where model ~* '(whisper|transcribe)';
