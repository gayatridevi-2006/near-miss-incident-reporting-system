import os
from datetime import timedelta
import pymysql

class Config:
    # Core Flask configurations
    SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-key-change-in-production")
    
    # JWT Settings
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "jwt-secret-key-change-in-production")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=8)
    
    # Database Settings
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Upload Settings
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'app', 'static', 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
    
    # Construct Database URI
    # PostgreSQL via DATABASE_URL is opt-in so local startup does not block on
    # Supabase/PostgreSQL availability.
    USE_DATABASE_URL = os.getenv("USE_DATABASE_URL", "false").lower() in ("1", "true", "yes")
    DATABASE_URL = os.getenv("DATABASE_URL")
    if DATABASE_URL and USE_DATABASE_URL:
        if DATABASE_URL.startswith("postgres://"):
            DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
        elif DATABASE_URL.startswith("postgresql://"):
            DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)
        if DATABASE_URL.startswith("postgresql://") and "sslmode=" not in DATABASE_URL:
            separator = "&" if "?" in DATABASE_URL else "?"
            DATABASE_URL = f"{DATABASE_URL}{separator}sslmode=require"
        if DATABASE_URL.startswith("postgresql+psycopg://") and "sslmode=" not in DATABASE_URL:
            separator = "&" if "?" in DATABASE_URL else "?"
            DATABASE_URL = f"{DATABASE_URL}{separator}sslmode=require"
        if DATABASE_URL.startswith("postgresql+psycopg://") and "connect_timeout=" not in DATABASE_URL:
            separator = "&" if "?" in DATABASE_URL else "?"
            DATABASE_URL = f"{DATABASE_URL}{separator}connect_timeout=10"
        SQLALCHEMY_DATABASE_URI = DATABASE_URL
    else:
        if DATABASE_URL and not USE_DATABASE_URL:
            print("INFO: DATABASE_URL is set but disabled. Using local SQLite for SQLAlchemy startup.")
        db_host = os.getenv("DB_HOST")
        db_port = os.getenv("DB_PORT", "3306")
        db_user = os.getenv("DB_USER")
        db_password = os.getenv("DB_PASSWORD")
        db_name = os.getenv("DB_NAME")
        
        mysql_connected = False
        if all([db_host, db_user, db_password, db_name]):
            # Try a quick connection test to see if MySQL is alive
            try:
                # We try connecting to host without db first, in case DB needs to be created
                conn = pymysql.connect(
                    host=db_host,
                    port=int(db_port),
                    user=db_user,
                    password=db_password,
                    connect_timeout=2
                )
                # Create database if not exists
                with conn.cursor() as cursor:
                    cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_name}")
                conn.commit()
                conn.close()
                mysql_connected = True
            except Exception as e:
                print(f"INFO: MySQL is configured but connection failed: {e}")
        
        if mysql_connected:
            SQLALCHEMY_DATABASE_URI = f"mysql+pymysql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
            print("SUCCESS: Connected to MySQL database.")
        else:
            base_dir = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
            SQLALCHEMY_DATABASE_URI = f"sqlite:///{os.path.join(base_dir, 'near_miss.db')}"
            print("WARNING: MySQL connection test failed or settings missing. Falling back to local SQLite database.")
