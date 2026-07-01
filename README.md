# Near Miss Incident Reporting & Management System (Safe-Steel ERP)

An enterprise-grade, role-based safety compliance web application developed for large integrated steel plants. It facilitates reporting near-miss hazards, running safety audits, assigning corrective/preventive actions (CAPA), and tracking system compliance audit trails.

---

## 🏗️ Project Architecture

This application employs a decoupled Clean Architecture structure:
- **Frontend (Client)**: Built with React.js using Vite for bundling, featuring a glassmorphic dark theme and a rigid Role-Based Access Control (RBAC) visibility grid styled with Vanilla CSS.
- **Backend (API)**: Powered by Flask (Python), exposing modular blueprints, service logic layers, audit-logging interceptors, and JWT verification hooks.
- **Database (Persistence)**: Integrated with MySQL using SQLAlchemy. In the absence of an active MySQL connection string, the system transparently falls back to local SQLite to guarantee immediate offline running and validation.

---

## 📂 Project Structure

```
c:\Users\Gayatri Devi\OneDrive\Desktop\Near miss incident\
├── backend/
│   ├── app/
│   │   ├── __init__.py           # Flask Factory & DB Seeder
│   │   ├── config.py             # System Configurations (MySQL / SQLite fallback)
│   │   ├── database.py           # SQLAlchemy Instance
│   │   ├── models/               # Database Entities
│   │   │   ├── user.py
│   │   │   ├── department.py
│   │   │   ├── incident.py
│   │   │   ├── action_item.py
│   │   │   └── audit_log.py
│   │   ├── routes/               # Flask Controller Blueprints
│   │   │   ├── auth.py
│   │   │   ├── incidents.py
│   │   │   ├── departments.py
│   │   │   ├── actions.py
│   │   │   └── analytics.py
│   │   └── utils/
│   │       ├── auth_helpers.py   # RBAC Decorators & Log Helpers
│   ├── requirements.txt          # Python dependencies
│   ├── run.py                    # Server executable
│   └── schema.sql                # Raw MySQL Schema script
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/           # Reusable UI elements (Sidebar, Navbar, etc.)
│   │   ├── context/              # Authentication states
│   │   ├── pages/                # Views (Dashboards, Report Form, CAPA Log, etc.)
│   │   ├── services/             # Axios API wrapper with interceptors
│   │   ├── App.css
│   │   ├── App.jsx               # Router configurations and security guards
│   │   ├── index.css             # Unified CSS Design tokens
│   │   └── main.jsx
│   ├── package.json              # React packages
│   └── vite.config.js            # Vite configs and proxy settings
└── README.md
```

---

## 🔐 Role-Based Access Credentials (ERP Seeding)

On the initial backend boot, the database is auto-seeded with four primary enterprise roles to enable complete functionality out of the box:

| User | Password | Role | Access Scope |
| :--- | :--- | :--- | :--- |
| `admin` | `admin123` | **System Administrator** | Complete control, audit log viewer, configure departments, manage users. |
| `safety` | `safe123` | **Safety Officer** | Start safety investigations, propose and assign CAPA items plant-wide. |
| `hod` | `hod123` | **Head of Department (HOD)** | Sign off completed CAPA actions in their department, monitor department safety score. |
| `employee` | `emp123` | **Employee** | Report near-miss hazards, view own reports, execute assigned CAPA safety actions. |

---

## 🚀 How to Run locally

### 1. Backend Server Setup
From the `backend/` directory:
1. (Optional) Set up a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   ```
2. Install Python packages:
   ```bash
   pip install -r requirements.txt
   ```
3. Configure the database:
   - Edit the values in `.env` if connecting to a local MySQL instance.
   - If MySQL variables are left as default and no MySQL service is active on port `3306`, the application will output a warning and run via local SQLite (`near_miss.db`).
4. Boot the API:
   ```bash
   python run.py
   ```
   The backend will run on `http://127.0.0.1:5000/`.

### 2. Frontend React Client Setup
From the `frontend/` directory:
1. Install package dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
   The client will run on `http://localhost:3000/`. All `/api` queries will proxy automatically to the backend.
