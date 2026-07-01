import os
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from app.config import Config
from app.database import db

jwt = JWTManager()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Initialize extensions
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    db.init_app(app)
    jwt.init_app(app)
    
    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.incidents import incidents_bp
    from app.routes.departments import departments_bp
    from app.routes.actions import actions_bp
    from app.routes.analytics import analytics_bp
    from app.routes.hod import hod_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(incidents_bp, url_prefix='/api/incidents')
    app.register_blueprint(departments_bp, url_prefix='/api/departments')
    app.register_blueprint(actions_bp, url_prefix='/api/actions')
    app.register_blueprint(analytics_bp, url_prefix='/api/analytics')
    app.register_blueprint(hod_bp, url_prefix='/api/hod')
    
    # Ensure upload folder exists
    if 'UPLOAD_FOLDER' in app.config:
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    # Initialize and seed database
    with app.app_context():
        try:
            db.create_all()
            # Dynamic SQLite Migration
            try:
                import sqlite3
                db_path = os.path.join(app.root_path, "..", "near_miss.db")
                if os.path.exists(db_path):
                    conn = sqlite3.connect(db_path)
                    cursor = conn.cursor()
                    cursor.execute("PRAGMA table_info(users)")
                    columns = [c[1] for c in cursor.fetchall()]
                    if 'password_reset_required' not in columns:
                        print("Migration: Adding password_reset_required column to users table.")
                        cursor.execute("ALTER TABLE users ADD COLUMN password_reset_required BOOLEAN DEFAULT 1 NOT NULL")
                    if 'created_by' not in columns:
                        print("Migration: Adding created_by column to users table.")
                        cursor.execute("ALTER TABLE users ADD COLUMN created_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL")
                    conn.commit()
                    conn.close()
            except Exception as migration_error:
                print(f"Database dynamic migration warning: {migration_error}")

            seed_database()
            verify_and_fix_hod()
        except Exception as e:
            print(f"Database initialization/seeding warning: {e}")
            
    return app

def seed_database():
    from app.models.department import Department
    from app.models.user import User
    
    # Check if departments are already seeded
    if Department.query.first() is not None:
        return
        
    print("Database empty. Seeding initial departments and users...")
    
    # 1. Seed Departments
    depts = [
        Department(department_name='Blast Furnace', department_code='BF'),
        Department(department_name='Steel Melting Shop', department_code='SMS'),
        Department(department_name='Rolling Mill', department_code='RM'),
        Department(department_name='Coke Ovens', department_code='CO'),
        Department(department_name='Safety & Environment', department_code='SAF'),
        Department(department_name='Maintenance & Utilities', department_code='MNT')
    ]
    for d in depts:
        db.session.add(d)
    db.session.commit()
    
    # Get department ids
    bf_dept = Department.query.filter_by(department_code='BF').first()
    saf_dept = Department.query.filter_by(department_code='SAF').first()
    sms_dept = Department.query.filter_by(department_code='SMS').first()
    
    # 2. Seed Users
    users = [
        # Admin
        User(
            employee_id='admin',
            email='admin@steelplant.gov.in',
            name='Rajesh Sharma',
            role='Admin',
            department_id=saf_dept.department_id,
            first_login=False,
            temporary_password=False
        ),
        # Employee
        User(
            employee_id='employee',
            email='employee@steelplant.gov.in',
            name='Amit Kumar',
            role='Employee',
            department_id=bf_dept.department_id,
            first_login=False,
            temporary_password=False
        ),
        # Safety Officer
        User(
            employee_id='safety',
            email='safety.officer@steelplant.gov.in',
            name='Sanjay Verma',
            role='Safety_Officer',
            department_id=saf_dept.department_id,
            first_login=False,
            temporary_password=False
        ),
        # HOD
        User(
            employee_id='hod',
            email='hod.bf@steelplant.gov.in',
            name='Vikram Singh',
            role='HOD',
            department_id=bf_dept.department_id,
            first_login=True,
            temporary_password=True
        ),
        # General Manager
        User(
            employee_id='gm',
            email='gm@steelplant.gov.in',
            name='G. Venkatraman',
            role='General_Manager',
            department_id=saf_dept.department_id,
            first_login=False,
            temporary_password=False
        ),
        # Plant Head
        User(
            employee_id='planthead',
            email='planthead@steelplant.gov.in',
            name='K. Srinivas Rao',
            role='Plant_Head',
            department_id=saf_dept.department_id,
            first_login=False,
            temporary_password=False
        ),
        # Senior Management (Read Only)
        User(
            employee_id='seniormgmt',
            email='senior.mgmt@steelplant.gov.in',
            name='M. R. K. Prasad',
            role='Senior_Management',
            department_id=saf_dept.department_id,
            first_login=False,
            temporary_password=False
        )
    ]
    
    # Set passwords
    users[0].set_password('admin123')
    users[1].set_password('emp123')
    users[2].set_password('safe123')
    users[3].set_password('hod123')
    users[4].set_password('gm123')
    users[5].set_password('ph123')
    users[6].set_password('sm123')
    
    for u in users:
        db.session.add(u)
    db.session.commit()
    print("Database seeding completed successfully.")

def verify_and_fix_hod():
    from app.models.department import Department
    from app.models.user import User

    # 1. Check if HOD user exists
    hod = User.query.filter_by(employee_id='hod').first()
    
    # 2. Get first department as fallback or BF department
    bf_dept = Department.query.filter_by(department_code='BF').first()
    if not bf_dept:
        bf_dept = Department.query.first()
    if not bf_dept:
        # If no department exists at all, seed default departments
        print("No departments found. Seeding departments first...")
        depts = [
            Department(department_name='Blast Furnace', department_code='BF'),
            Department(department_name='Steel Melting Shop', department_code='SMS'),
            Department(department_name='Rolling Mill', department_code='RM'),
            Department(department_name='Coke Ovens', department_code='CO'),
            Department(department_name='Safety & Environment', department_code='SAF'),
            Department(department_name='Maintenance & Utilities', department_code='MNT')
        ]
        for d in depts:
            db.session.add(d)
        db.session.commit()
        bf_dept = Department.query.filter_by(department_code='BF').first()

    if hod is None:
        print("HOD account is missing. Automatically creating a default HOD account...")
        hod = User(
            employee_id='hod',
            email='hod.bf@steelplant.gov.in',
            name='Vikram Singh',
            role='HOD',
            department_id=bf_dept.department_id,
            status='Active',
            first_login=False,
            temporary_password=False,
            password_reset_required=False
        )
        hod.set_password('hod123')
        db.session.add(hod)
        db.session.commit()
        print("Default HOD account created successfully.")
    else:
        # Verify and fix HOD account details
        modified = False
        if hod.role != 'HOD':
            print(f"Fixing HOD user role: {hod.role} -> HOD")
            hod.role = 'HOD'
            modified = True
            
        if hod.status != 'Active':
            print(f"Fixing HOD user status: {hod.status} -> Active")
            hod.status = 'Active'
            modified = True
            
        if hod.department_id is None:
            print(f"Fixing HOD user department: None -> {bf_dept.department_name}")
            hod.department_id = bf_dept.department_id
            modified = True

        # Always check and ensure the HOD password matches 'hod123'
        if not hod.check_password('hod123'):
            print("Fixing HOD user password hash: resetting to hod123")
            hod.set_password('hod123')
            modified = True

        # Ensure first_login is False to bypass mandatory reset during demo logins
        if hod.first_login or hod.temporary_password or hod.password_reset_required:
            print("Fixing HOD user first_login / temporary_password / password_reset_required: setting to False")
            hod.first_login = False
            hod.temporary_password = False
            hod.password_reset_required = False
            modified = True

        if modified:
            db.session.commit()
            print("HOD user attributes verified and corrected in the database.")
        else:
            print("HOD user is verified and correct.")
