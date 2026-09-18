-- Give archive items a real, user-editable title.
--
-- `file_name` (0001_init.sql) is a legacy column that current upload code
-- never populates: file uploads now go through the generic
-- form_fields/archive_item_values system instead of the old single-file
-- columns on archive_items. `title` replaces `file_name` as the
-- user-facing name for a record; the app defaults it to the uploaded file's
-- original name at creation time when the user doesn't type one.

alter table ampersand.archive_items
  add column if not exists title text;
