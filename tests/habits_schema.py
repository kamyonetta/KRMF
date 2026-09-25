from pathlib import Path
import sqlite3
c=sqlite3.connect(':memory:')
for path in sorted((Path(__file__).resolve().parents[1]/'src-tauri/migrations').glob('*.sql')):
    if path.name.startswith('010'):
        c.execute("INSERT INTO habits(id,title,created_at) VALUES('old','Existing','2026-09-17T12:00:00Z')")
        c.execute("INSERT INTO habit_checkins VALUES('old','2026-09-16')")
    c.executescript(path.read_text())
assert c.execute("SELECT weekday_mask,starts_on FROM habits WHERE id='old'").fetchone()==(127,'2026-09-16')
c.execute("INSERT INTO habits(id,title,weekday_mask,starts_on) VALUES('new','Read',42,'2026-09-17')")
c.execute("INSERT INTO habit_checkins VALUES('new','2026-09-18')")
try:c.execute("INSERT INTO habits(id,title,weekday_mask) VALUES('bad','Empty schedule',0)")
except sqlite3.IntegrityError:pass
else:raise AssertionError('Empty schedule accepted')
c.execute("DELETE FROM habits WHERE id='old'")
assert c.execute("SELECT count(*) FROM habit_checkins WHERE habit_id='old'").fetchone()[0]==0
assert c.execute("SELECT count(*) FROM habit_checkins WHERE habit_id='new'").fetchone()[0]==1
print('Existing habits preserved; weekday validation and complete targeted deletion passed.')
