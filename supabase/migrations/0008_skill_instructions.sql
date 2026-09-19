-- Skills can carry standing instructions (markdown) that are sent to the model
-- as part of the system prompt on every call — e.g. an SEO/GEO writing guide.
-- Optional: null means the skill adds no instructions of its own.

alter table ampersand.ai_skills
  add column if not exists instructions text;
