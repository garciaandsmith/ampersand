-- Rename the "Tasks" concept to "Skills" throughout.
--
-- This is a live table with real configured rows, so we rename the table
-- and column in place (ALTER ... RENAME) instead of dropping/recreating.
-- We also rename two existing skill_key values to match the renamed skills
-- in application code, and seed the two new skills introduced alongside
-- this rename (document_parsing, image_generation).

alter table ampersand.ai_task_assignments rename to ai_skill_assignments;
alter table ampersand.ai_skill_assignments rename column task_key to skill_key;

-- 'visual_recognition' -> 'image_recognition', 'chat' -> 'text_generation'.
update ampersand.ai_skill_assignments set skill_key = 'image_recognition' where skill_key = 'visual_recognition';
update ampersand.ai_skill_assignments set skill_key = 'text_generation' where skill_key = 'chat';

insert into ampersand.ai_skill_assignments (skill_key, model) values
  ('document_parsing', null),
  ('image_generation', null)
on conflict (skill_key) do nothing;
