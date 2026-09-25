ALTER TABLE habits ADD COLUMN weekday_mask INTEGER NOT NULL DEFAULT 127 CHECK(weekday_mask BETWEEN 1 AND 127);
ALTER TABLE habits ADD COLUMN starts_on TEXT NOT NULL DEFAULT '2026-09-01';
UPDATE habits SET starts_on = max('2026-09-01',min(substr(created_at,1,10),coalesce((SELECT min(checkin_date) FROM habit_checkins WHERE habit_id=habits.id),substr(created_at,1,10))));
-- Explicit cleanup is atomic even on a connection without foreign_keys enabled.
CREATE TRIGGER habit_delete_checkins AFTER DELETE ON habits
BEGIN
 DELETE FROM habit_checkins WHERE habit_id=OLD.id;
END;
