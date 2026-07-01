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
    DATABASE_URL = os.getenv("DATABASE_URL")
    if DATABASE_URL:
        SQLALCHEMY_DATABASE_URI = DATABASE_URL
    else:
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
