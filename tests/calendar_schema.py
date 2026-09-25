"""Exercise migrations and persisted important events without touching user data."""
from pathlib import Path
import sqlite3
import tempfile

root = Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory() as directory:
    database = Path(directory) / 'calendar.db'
    connection = sqlite3.connect(database)
    for migration in sorted((root / 'src-tauri/migrations').glob('*.sql')):
        connection.executescript(migration.read_text())
    for i, color in enumerate(['red', 'purple', 'green', 'blue', 'yellow']):
        connection.execute('INSERT INTO important_events(id,event_date,title,color) VALUES (?,?,?,?)',
                           (str(i), '2026-09-17', 'Exam', color))
    for date, title, color in [
        ('2026-08-31', 'Exam', 'red'), ('2028-01-01', 'Exam', 'red'),
        ('2027-02-29', 'Exam', 'red'), ('2026-13-01', 'Exam', 'red'),
        ('2026-09-17', '', 'red'), ('2026-09-17', 'Exam', 'pink'),
    ]:
        try:
            connection.execute('INSERT INTO important_events(id,event_date,title,color) VALUES (?,?,?,?)',
                               ('invalid', date, title, color))
        except sqlite3.IntegrityError:
            continue
        raise AssertionError((date, title, color))
    try:
        connection.execute("UPDATE important_events SET event_date='2026-13-01' WHERE id='0'")
    except sqlite3.IntegrityError:
        pass
    else:
        raise AssertionError('Invalid date update accepted')
    connection.commit()
    connection.close()
    with sqlite3.connect(database) as connection:
        assert connection.execute('SELECT count(*) FROM important_events').fetchone()[0] == 5
        assert connection.execute("SELECT event_date FROM important_events WHERE id='0'").fetchone()[0] == '2026-09-17'
print('Calendar migration, constraints, and persistence checks passed.')
