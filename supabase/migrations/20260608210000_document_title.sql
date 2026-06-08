-- Human-readable chapter title (editable in Admin). Falls back to filename in the app.
alter table documents add column if not exists title text;
