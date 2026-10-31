import json
from contextlib import contextmanager
from pathlib import Path
import sqlite3


class Glossary:
    def __init__(self, path: Path):
        path.parent.mkdir(parents=True, exist_ok=True)
        self.path = path
        with self.connect() as database:
            database.execute("CREATE TABLE IF NOT EXISTS glossaries (profile TEXT PRIMARY KEY, entries TEXT NOT NULL)")

    def seed_presets(self):
        presets=json.loads((Path(__file__).with_name("presets") / "glossary-presets.json").read_text(encoding="utf-8"))
        for profile, entries in presets.items():
            if self.create(profile):
                self.put(profile,entries)

    @contextmanager
    def connect(self):
        database = sqlite3.connect(self.path)
        try:
            with database:
                yield database
        finally:
            database.close()

    def get(self, profile: str) -> list[dict]:
        with self.connect() as database:
            row = database.execute("SELECT entries FROM glossaries WHERE profile = ?", (profile,)).fetchone()
        return json.loads(row[0]) if row else []

    def profiles(self) -> list[dict]:
        with self.connect() as database:
            rows = database.execute("SELECT profile, entries FROM glossaries ORDER BY profile").fetchall()
        result = {profile: len(json.loads(entries)) for profile, entries in rows}
        result.setdefault("global", 0)
        return [{"id": profile, "count": count} for profile, count in sorted(result.items(), key=lambda item: (item[0] != "global", item[0]))]

    def create(self, profile: str) -> bool:
        with self.connect() as database:
            return database.execute("INSERT OR IGNORE INTO glossaries VALUES (?, '[]')", (profile,)).rowcount == 1

    def put(self, profile: str, entries: list[dict]):
        with self.connect() as database:
            database.execute("INSERT INTO glossaries VALUES (?, ?) ON CONFLICT(profile) DO UPDATE SET entries = excluded.entries",
                             (profile, json.dumps(entries, ensure_ascii=False)))

    def for_session(self, profiles: list[str]) -> list[dict]:
        merged = {}
        ordered=[p for p in profiles if p.startswith("topic:")] + ["global"] + [p for p in profiles if not p.startswith("topic:")]
        for profile in ordered:
            for term in self.get(profile):
                merged[term["source"]] = term
        return list(merged.values())
