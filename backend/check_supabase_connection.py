import os
from urllib.parse import urlsplit, urlunsplit

from dotenv import load_dotenv
from sqlalchemy import create_engine, text


def normalize_database_url(url):
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg://", 1)
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)

    if url.startswith("postgresql+psycopg://") and "sslmode=" not in url:
        separator = "&" if "?" in url else "?"
        url = f"{url}{separator}sslmode=require"

    if url.startswith("postgresql+psycopg://") and "connect_timeout=" not in url:
        separator = "&" if "?" in url else "?"
        url = f"{url}{separator}connect_timeout=10"

    return url


def mask_url(url):
    try:
        parsed = urlsplit(url)
        if "@" not in parsed.netloc:
            return url
        userinfo, hostinfo = parsed.netloc.rsplit("@", 1)
        username = userinfo.split(":", 1)[0]
        masked_netloc = f"{username}:***@{hostinfo}"
        return urlunsplit((parsed.scheme, masked_netloc, parsed.path, parsed.query, parsed.fragment))
    except Exception:
        return "***"


def table_exists(conn, table_name):
    return conn.execute(
        text(
            "select count(*) from information_schema.tables "
            "where table_schema = 'public' and table_name = :table_name"
        ),
        {"table_name": table_name},
    ).scalar()


def test_connection(name, raw_url):
    print(f"\n=== {name} ===")
    if not raw_url:
        print("configured: no")
        return False

    url = normalize_database_url(raw_url.strip())
    print("configured: yes")
    print("target:", mask_url(url))

    try:
        engine = create_engine(url, pool_pre_ping=True)
        with engine.connect() as conn:
            print("connected: yes")
            print("database:", conn.execute(text("select current_database()")).scalar())
            print("server:", conn.execute(text("select inet_server_addr()")).scalar())
            print("port:", conn.execute(text("select inet_server_port()")).scalar())

            departments_exists = table_exists(conn, "departments")
            users_exists = table_exists(conn, "users")
            print("departments table:", departments_exists)
            print("users table:", users_exists)

            if departments_exists:
                print("departments rows:", conn.execute(text("select count(*) from departments")).scalar())
            if users_exists:
                print("users rows:", conn.execute(text("select count(*) from users")).scalar())
        return True
    except Exception as exc:
        print("connected: no")
        print("error:", f"{type(exc).__name__}: {exc}")
        return False


load_dotenv()

variables = [
    "DATABASE_URL",
    "SUPABASE_DIRECT_URL",
    "SUPABASE_POOLER_URL",
]

results = [test_connection(name, os.getenv(name)) for name in variables]

if not any(results):
    raise SystemExit(1)
