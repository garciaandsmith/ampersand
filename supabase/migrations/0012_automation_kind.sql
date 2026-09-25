-- An automated field can now be filled by a deterministic JSON key read
-- instead of an AI call. 'ai' (default) is every automated field's existing
-- behaviour: a skill call following automation_prompt. 'json_extract' reads
-- the field's source (expected to hold a JSON object, typically another
-- automated field's AI-generated output), parses it, and copies out
-- automation_json_key with no model call and no cost.

alter table ampersand.form_fields
  add column if not exists automation_kind text not null default 'ai'
    check (automation_kind in ('ai', 'json_extract'));

alter table ampersand.form_fields
  add column if not exists automation_json_key text;
