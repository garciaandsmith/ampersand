-- Skills become a small "recipe": besides provider + model they can now carry
-- an effort level and an output-token limit. Both are optional; null means
-- "use the model's default", so existing skills keep working unchanged.
--
-- Which values are valid depends on the model, and that catalog lives in
-- application code (src/lib/ai/models.ts), so the database only guards the
-- basic shape.

alter table ampersand.ai_skills
  add column if not exists effort text
    check (effort in ('low', 'medium', 'high', 'xhigh', 'max')),
  add column if not exists max_output_tokens integer
    check (max_output_tokens > 0);
