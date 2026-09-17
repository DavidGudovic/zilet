-- Preserve work and revision ordering if an installation used the retired rubric.
UPDATE revisions SET content = jsonb_set(content, '{rubrics}', (
  SELECT jsonb_agg(rubric ORDER BY first_position)
  FROM (
    SELECT CASE WHEN value = 'knjizevna-kritika' THEN 'eseji' ELSE value END AS rubric,
           min(position) AS first_position
    FROM jsonb_array_elements_text(content->'rubrics') WITH ORDINALITY AS items(value, position)
    GROUP BY CASE WHEN value = 'knjizevna-kritika' THEN 'eseji' ELSE value END
  ) mapped
)) WHERE content->'rubrics' ? 'knjizevna-kritika';

UPDATE submissions SET rubric = 'eseji' WHERE rubric = 'knjizevna-kritika';
