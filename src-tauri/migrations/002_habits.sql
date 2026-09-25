CREATE TABLE habits (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL CHECK(length(trim(title)) > 0),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE TABLE habit_checkins (
    habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    checkin_date TEXT NOT NULL,
    PRIMARY KEY (habit_id, checkin_date)
);
