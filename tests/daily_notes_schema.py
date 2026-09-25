"""Migration retains legacy notes and permits long, multiline edits."""
import sqlite3
from pathlib import Path

db = sqlite3.connect(':memory:')
paths = sorted(Path('src-tauri/migrations').glob('*.sql'))
for path in paths:
    if path.name.startswith('011_'):
        db.execute("INSERT INTO day_planner_lines VALUES ('2026-09-18','note',0,'first note',0)")
        db.execute("INSERT INTO day_planner_lines VALUES ('2026-09-18','note',2,'second note',0)")
    db.executescript(path.read_text())
assert db.execute('SELECT body FROM daily_notes').fetchone()[0] == 'first note\nsecond note'
body = 'A long note that wraps instead of stopping.\n' * 50
db.execute("UPDATE daily_notes SET body=? WHERE plan_date='2026-09-18'", (body,))
assert db.execute('SELECT body FROM daily_notes').fetchone()[0] == body
# Important event deletion removes only the selected event.
for id in ['one', 'two']:
    db.execute("INSERT INTO important_events(id,event_date,title,color) VALUES(?,'2026-09-18','Birthday','red')",(id,))
db.execute('DELETE FROM important_events WHERE id=?',('one',))
assert db.execute('SELECT id FROM important_events').fetchall() == [('two',)]
print('Note migration, multiline persistence, and targeted deletion passed.')
db.execute("INSERT INTO day_planner_lines VALUES('2026-09-18','todo',25,'Extra task',1)")
assert db.execute("SELECT text FROM day_planner_lines WHERE section='todo' AND position=25").fetchone()[0] == 'Extra task'
db.execute("INSERT INTO day_planner_lines VALUES('2026-09-18','slot',0,'Class',0)")
db.execute("INSERT INTO timed_event_series(id,title,first_date,start_minute,end_minute,color,source_date,source_first,source_last,source_text) VALUES('test','Class','2026-09-18',480,510,'blue','2026-09-18',0,0,'Class')")
assert not db.execute("SELECT 1 FROM day_planner_lines WHERE section='slot' AND position=0").fetchall()
print('Expandable daily to-dos and event conversion passed.')
