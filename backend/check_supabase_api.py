from pathlib import Path
import importlib
import re

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent
APP_DIR = BASE_DIR / "app"
SCHEMA_PATH = BASE_DIR / "supabase" / "schema.sql"

REQUIRED_TABLES = {
    "users",
    "departments",
    "incidents",
    "corrective_actions",
    "registration_requests",
    "incident_reviews",
    "audit_logs",
}


def discover_model_tables():
    tables = set()
    models_dir = APP_DIR / "models"

    for path in models_dir.glob("*.py"):
        if path.name == "__init__.py":
            continue

        module_name = f"app.models.{path.stem}"
        try:
            module = importlib.import_module(module_name)
        except Exception:
            continue

        for value in module.__dict__.values():
            table_name = getattr(value, "__tablename__", None)
            if table_name:
                tables.add(table_name)

    return tables


def discover_schema_tables():
    if not SCHEMA_PATH.exists():
        return set()

    schema = SCHEMA_PATH.read_text(encoding="utf-8")
    return set(re.findall(r"create\s+table\s+if\s+not\s+exists\s+([a-zA-Z_][\w]*)", schema, re.IGNORECASE))


def get_tables_to_test():
    return sorted(REQUIRED_TABLES | discover_model_tables() | discover_schema_tables())


def test_table(client, table_name):
    try:
        response = client.table(table_name).select("*").limit(1).execute()
        rows = response.data or []
        return {
            "table": table_name,
            "status": "PASS",
            "rows": len(rows),
            "error": "",
        }
    except Exception as exc:
        return {
            "table": table_name,
            "status": "FAIL",
            "rows": 0,
            "error": f"{type(exc).__name__}: {exc}",
        }


def main():
    load_dotenv(BASE_DIR / ".env")

    from app.supabase_client import get_supabase

    client = get_supabase()
    tables = get_tables_to_test()
    results = []

    print("Supabase API table connectivity check")
    print(f"Tables discovered: {len(tables)}")

    for table_name in tables:
        result = test_table(client, table_name)
        results.append(result)

        print(f"\nTable: {result['table']}")
        print(f"Status: {result['status']}")
        print(f"Rows returned: {result['rows']}")
        if result["error"]:
            print(f"Error: {result['error']}")

    passed = sum(1 for result in results if result["status"] == "PASS")
    failed = len(results) - passed

    print("\nSummary")
    print(f"Total tables tested: {len(results)}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")

    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
