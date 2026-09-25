import sqlite3
from pathlib import Path

db = sqlite3.connect(':memory:')
for path in sorted(Path('src-tauri/migrations').glob('*.sql')):
    db.executescript(path.read_text())
for id in ['series','other']:
    db.execute("INSERT INTO timed_event_series(id,title,first_date,start_minute,end_minute,repeat_until,color) VALUES(?,'Class','2026-09-15',600,660,'2026-09-29','blue')",(id,))
db.execute("UPDATE timed_event_series SET excluded_dates=json_insert(excluded_dates,'$[#]',$2) WHERE id=$1",{'1':'series','2':'2026-09-22'})
assert db.execute("SELECT excluded_dates FROM timed_event_series WHERE id='series'").fetchone()[0] == '["2026-09-22"]'
for pos,name in [(0,'Class'),(1,'Class'),(2,'Other'),(3,'Class')]:
    db.execute("INSERT INTO day_planner_lines VALUES('2026-09-15','slot',?,?,0)",[pos,name])
db.execute("DELETE FROM day_planner_lines WHERE plan_date=$1 AND section='slot' AND position BETWEEN $2 AND $3 AND trim(text)=$4",{'1':'2026-09-15','2':0,'3':1,'4':'Class'})
assert db.execute('SELECT position FROM day_planner_lines ORDER BY position').fetchall() == [(2,),(3,)]
db.execute('DELETE FROM timed_event_series WHERE id=?',['series'])
assert db.execute('SELECT id FROM timed_event_series').fetchall() == [('other',)]
print('Single recurrence, merged-slot deletion, and whole-series isolation passed.')
