from pathlib import Path
import sqlite3
import tempfile

root = Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory() as directory:
    path = Path(directory) / 'planner.db'
    db = sqlite3.connect(path)
    for migration in sorted((root / 'src-tauri/migrations').glob('*.sql')):
        db.executescript(migration.read_text())
    write = '''INSERT INTO day_planner_lines VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(plan_date, section, position) DO UPDATE SET text=excluded.text, checked=excluded.checked'''
    db.execute(write, ('2026-09-17', 'todo', 0, '', 1))
    db.execute(write, ('2026-09-17', 'todo', 0, 'Read chapter one', 1))
    db.execute(write, ('2026-09-18', 'todo', 0, '', 0))
    db.execute(write, ('2026-09-17', 'slot', 23, 'Evening study', 0))
    db.execute(write, ('2026-09-17', 'note', 7, 'Bring notebook', 0))
    for row in [
        ('2026-09-17','todo',14,'',0), ('2026-09-17','slot',32,'',0),
        ('2026-09-17','note',8,'',0), ('2026-09-17','slot',0,'x'*21,0),
        ('2026-09-17','slot',0,'',1), ('2027-02-29','todo',0,'',0),
        ('2028-01-01','todo',0,'',0),
    ]:
        try: db.execute(write,row)
        except sqlite3.IntegrityError: continue
        raise AssertionError(row)
    db.commit(); db.close()
    db = sqlite3.connect(path)
    assert db.execute("SELECT text, checked FROM day_planner_lines WHERE plan_date='2026-09-17' AND section='todo'").fetchone() == ('Read chapter one',1)
    assert db.execute("SELECT text, checked FROM day_planner_lines WHERE plan_date='2026-09-18'").fetchone() == ('',0)
    db.execute(write, ('2026-09-17','todo',0,'',0))
    assert db.execute("SELECT text, checked FROM day_planner_lines WHERE plan_date='2026-09-17' AND section='todo'").fetchone() == ('',0)
    db.close()
print('Day planner persistence, blank checks, rename, clear, date isolation and limits passed.')
