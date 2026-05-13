ALTER TABLE jobs ADD COLUMN search_vector tsvector;

UPDATE jobs
SET search_vector =
    setweight(to_tsvector('english', coalesce(title, '')), 'A')
 || setweight(to_tsvector('english', coalesce(location, '')), 'B')
 || setweight(to_tsvector('english', coalesce(description, '')), 'C');

CREATE INDEX idx_jobs_search_vector ON jobs USING GIN (search_vector);

CREATE FUNCTION jobs_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A')
 || setweight(to_tsvector('english', coalesce(NEW.location, '')), 'B')
 || setweight(to_tsvector('english', coalesce(NEW.description, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER jobs_search_vector_trigger
BEFORE INSERT OR UPDATE ON jobs
FOR EACH ROW EXECUTE FUNCTION jobs_search_vector_update();
