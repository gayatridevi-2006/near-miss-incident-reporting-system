import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "backend", "near_miss.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("--- INCIDENTS ---")
cursor.execute("SELECT incident_id, incident_number, title, status FROM incidents")
for row in cursor.fetchall():
    print(row)

print("\n--- CORRECTIVE ACTIONS ---")
cursor.execute("SELECT action_id, incident_id, corrective_action, status, responsible_person FROM corrective_actions")
for row in cursor.fetchall():
    print(row)

conn.close()
