-- Example subjects so the app has structure on first run.
-- Upload the matching textbook PDFs from the Admin area (/admin).
insert into subjects (name, slug, description, color, grade, board) values
  ('Class 9 Chemistry',    'class-9-chemistry',    'Matter, atoms, and chemical reactions.', '#006BFF', 'Class 9', 'CBSE'),
  ('Class 9 Mathematics',  'class-9-mathematics',  'Number systems, algebra, and geometry.', '#8247F5', 'Class 9', 'CBSE')
on conflict (slug) do nothing;
