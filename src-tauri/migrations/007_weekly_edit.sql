-- Source metadata lets a single insert atomically replace daily text with a timed event.
ALTER TABLE timed_event_series ADD COLUMN source_date TEXT;
ALTER TABLE timed_event_series ADD COLUMN source_first INTEGER;
ALTER TABLE timed_event_series ADD COLUMN source_last INTEGER;
ALTER TABLE timed_event_series ADD COLUMN source_text TEXT;
ALTER TABLE timed_event_series ADD COLUMN source_event_id TEXT;
CREATE TRIGGER timed_series_replace_source AFTER INSERT ON timed_event_series
BEGIN
 DELETE FROM day_planner_lines WHERE section='slot' AND plan_date=NEW.source_date
   AND position BETWEEN NEW.source_first AND NEW.source_last AND trim(text)=NEW.source_text;
 DELETE FROM calendar_events WHERE id=NEW.source_event_id;
END;
