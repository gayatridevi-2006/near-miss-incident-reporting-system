import csv
import os
import sqlite3
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "near_miss.db"
EXPORT_DIR = BASE_DIR / "exports"

TABLES = [
    "departments",
    "users",
    "incidents",
    "incident_reviews",
    "corrective_actions",
    "registration_requests",
    "audit_logs",
]


def export_table(conn, table_name):
    cursor = conn.cursor()
    cursor.execute(
        "select name from sqlite_master where type = 'table' and name = ?",
        (table_name,),
    )
    if not cursor.fetchone():
        return None

    cursor.execute(f"select * from {table_name}")
    rows = cursor.fetchall()
    columns = [description[0] for description in cursor.description]

    output_path = EXPORT_DIR / f"{table_name}.csv"
    with output_path.open("w", newline="", encoding="utf-8") as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(columns)
        writer.writerows(rows)

    return output_path, len(rows)


def main():
    if not DB_PATH.exists():
        raise SystemExit(f"SQLite database not found: {DB_PATH}")

    EXPORT_DIR.mkdir(exist_ok=True)

    conn = sqlite3.connect(DB_PATH)
    try:
        print(f"Source database: {DB_PATH}")
        print(f"Export folder: {EXPORT_DIR}")
        for table in TABLES:
            result = export_table(conn, table)
            if result is None:
                print(f"{table}: table not found")
                continue

            path, row_count = result
            print(f"{table}: {row_count} rows -> {path}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
