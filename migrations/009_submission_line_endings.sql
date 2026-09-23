-- Form posts arrived with CRLF; submissions now store LF so prose keeps its paragraphs.
UPDATE submissions SET text = regexp_replace(text, E'\r\n?', E'\n', 'g') WHERE text ~ E'\r';
