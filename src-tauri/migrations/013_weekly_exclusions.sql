ALTER TABLE timed_event_series ADD COLUMN excluded_dates TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(excluded_dates) AND json_type(excluded_dates)='array');
