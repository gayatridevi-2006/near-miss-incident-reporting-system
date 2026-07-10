# Frontend Backend Integration Specification

This integration guide details the REST API specifications, authentication flows, error handling protocols, and endpoint schemas required for connecting the Near Miss Incident Reporting & Management System frontend to the Flask API backend server.

---

## 1. Authentication & API Client Configuration

### API Base URL Configuration
The frontend Axios client connects to the backend through a base URL loaded from environment variables:
- Global environment variable: `VITE_API_BASE_URL` (defined in `frontend/.env`)
- Default fallback in client configuration: `/api`

### Token-Based Authentication Flow
1. Upon successful login (`POST /api/auth/login`), the backend returns a JSON Web Token (JWT) as `access_token`.
2. The frontend stores this token in `localStorage` under the key `near_miss_token`.
3. An Axios request interceptor (`frontend/src/api/client.js`) automatically appends this token to all outgoing HTTP requests using the authorization header:
   ```http
   Authorization: Bearer <your_jwt_token_here>
   ```
4. If any request returns `401 Unauthorized` (due to token expiry or invalidation), an Axios response interceptor clears the local token storage and redirects the user to the `/login` page immediately.

---

## 2. API Endpoints Catalog

### 2.1. Authentication & Profile (`src/api/auth.js`)

#### Login User
- **URL:** `/auth/login`
- **Method:** `POST`
- **Request Format:**
  ```json
  {
    "username": "emp1234",
    "password": "TemporaryPassword@1234",
    "captcha_input": "xY89",
    "captcha_answer": "xY89"
  }
  ```
- **Response Format (200 OK):**
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "first_login": true,
    "user": {
      "user_id": 1,
      "employee_id": "emp1234",
      "name": "Rajesh Kumar",
      "email": "rajesh@steelplant.gov.in",
      "role": "Employee",
      "status": "Active"
    }
  }
  ```

#### Force First-Login Password Change
- **URL:** `/auth/first-login-change-password`
- **Method:** `POST`
- **Request Format:**
  ```json
  {
    "employee_id": "emp1234",
    "new_password": "NewSecurePassword@99"
  }
  ```
- **Response Format (200 OK):**
  ```json
  {
    "message": "Password changed successfully"
  }
  ```

#### Get Current Logged-in User Profile
- **URL:** `/auth/profile`
- **Method:** `GET`
- **Response Format (200 OK):**
  ```json
  {
    "user_id": 1,
    "employee_id": "emp1234",
    "name": "Rajesh Kumar",
    "email": "rajesh@steelplant.gov.in",
    "mobile_number": "9876543210",
    "role": "Employee",
    "status": "Active"
  }
  ```

---

### 2.2. User Management (`src/api/users.js`)
*Note: All endpoints in this category require `Admin` role privileges.*

#### List All Users
- **URL:** `/auth/users`
- **Method:** `GET`
- **Response Format (200 OK):**
  ```json
  [
    {
      "id": 1,
      "employee_id": "emp1234",
      "name": "Rajesh Kumar",
      "email": "rajesh@steelplant.gov.in",
      "role": "Employee",
      "status": "Active",
      "department_id": 2,
      "department": "Steel Melting Shop",
      "department_code": "SMS"
    }
  ]
  ```

#### Create New User Account
- **URL:** `/auth/users`
- **Method:** `POST`
- **Request Format:**
  ```json
  {
    "employee_id": "emp5678",
    "name": "Amit Sharma",
    "email": "amit@steelplant.gov.in",
    "role": "HOD",
    "department_id": 1,
    "mobile_number": "9876543211"
  }
  ```
- **Response Format (201 Created):**
  - *If credentials email succeeds:*
    ```json
    {
      "user": {
        "id": 10,
        "employee_id": "emp5678",
        "name": "Amit Sharma",
        "email": "amit@steelplant.gov.in",
        "role": "HOD",
        "department_id": 1,
        "status": "Active"
      },
      "email_sent": true
    }
    ```
  - *If credentials email fails (requires manual notification):*
    ```json
    {
      "user": {
        "id": 10,
        "employee_id": "emp5678",
        "name": "Amit Sharma",
        "email": "amit@steelplant.gov.in",
        "role": "HOD",
        "department_id": 1,
        "status": "Active"
      },
      "email_sent": false,
      "temporary_password": "HOD@5678"
    }
    ```

#### Update User Details
- **URL:** `/auth/users/<userId>`
- **Method:** `PUT`
- **Request Format:**
  ```json
  {
    "name": "Amit Sharma Modified",
    "email": "amit_new@steelplant.gov.in",
    "role": "HOD",
    "department_id": 1,
    "status": "Active"
  }
  ```
- **Response Format (200 OK):**
  ```json
  {
    "id": 10,
    "employee_id": "emp5678",
    "name": "Amit Sharma Modified",
    "email": "amit_new@steelplant.gov.in",
    "role": "HOD",
    "department_id": 1,
    "status": "Active"
  }
  ```

#### Activate / Deactivate / Archive User
- **URLs:**
  - `/auth/users/<userId>/activate` (`POST`)
  - `/auth/users/<userId>/deactivate` (`POST`)
  - `/auth/users/<userId>/archive` (`POST`)
- **Response Format (200 OK):**
  ```json
  {
    "id": 10,
    "status": "Inactive"
  }
  ```

#### Reset User Password (Administrative)
- **URL:** `/auth/users/<userId>/reset-password`
- **Method:** `POST`
- **Response Format (200 OK):**
  ```json
  {
    "email_sent": false,
    "temporary_password": "HOD@5678"
  }
  ```

---

### 2.3. Department Administration (`src/api/departments.js`)

#### List Departments
- **URL:** `/departments`
- **Method:** `GET`
- **Response Format (200 OK):**
  ```json
  [
    {
      "id": 1,
      "name": "Steel Melting Shop",
      "code": "SMS",
      "status": "Active"
    }
  ]
  ```

#### Create Department (Admin role required)
- **URL:** `/departments`
- **Method:** `POST`
- **Request Format:**
  ```json
  {
    "name": "Blast Furnace",
    "code": "BF"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "id": 2,
    "name": "Blast Furnace",
    "code": "BF",
    "status": "Active"
  }
  ```

---

### 2.4. Incident Reporting & Logging (`src/api/incidents.js`)

#### Create / Report Near Miss Incident
- **URL:** `/incidents`
- **Method:** `POST`
- **Request Format:** Multipart form data (allowing photo attachments).
  - `title`: String
  - `description`: String
  - `location`: String
  - `incident_date`: Date String (YYYY-MM-DD)
  - `department_id`: Integer
  - `severity`: String ('Low', 'Medium', 'High')
  - `photo`: File Binary (Optional)
- **Response Format (201 Created):**
  ```json
  {
    "incident_id": 45,
    "incident_number": "INC-SMS-2026-0045",
    "title": "Gas leakage detected near SMS floor",
    "status": "Pending"
  }
  ```

---

### 2.5. HOD Review & CAPA Assignment (`src/api/hod.js`)
*Note: All endpoints require `HOD` role privileges.*

#### List Incidents (Restricted to HOD's own Department)
- **URL:** `/hod/incidents`
- **Method:** `GET`
- **Response (200 OK):** Array of department incident records.

#### Assign Corrective & Preventive Action (CAPA)
- **URL:** `/hod/incidents/<incidentId>/capa`
- **Method:** `POST`
- **Request Format:**
  ```json
  {
    "corrective_action": "Tighten gas valve and replace sealing gasket.",
    "preventive_action": "Implement bi-weekly visual inspections of SMS valves.",
    "assigned_employee_id": 3,
    "target_date": "2026-07-15"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "message": "CAPA assigned and incident moved to Under Investigation status"
  }
  ```

#### Verify & Close Action
- **URL:** `/hod/incidents/<incidentId>/verify-closure`
- **Method:** `POST`
- **Request Format:**
  ```json
  {
    "notes": "Verified replacement gasket is working. Pressure levels are normal."
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "message": "Incident successfully verified and closed."
  }
  ```

---

### 2.6. Reports & Safety Analytics (`src/api/reports.js` & `src/api/management.js`)

#### Export Department Incident Report to Excel
- **URL:** `/hod/reports/export/excel`
- **Method:** `GET`
- **Params:** `start_date`, `end_date`, `status`, `severity`, `department_id`
- **Response Type:** Binary file blob (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`).

#### Fetch General Management Incident Stats
- **URL:** `/analytics/incident-stats`
- **Method:** `GET`
- **Response (200 OK):**
  ```json
  {
    "total": 120,
    "pending": 34,
    "investigating": 15,
    "capa_pending": 45,
    "closed": 26
  }
  ```

---

## 3. Standard HTTP Status Codes Mapping

| HTTP Code | Meaning | Context & Triggers |
| :--- | :--- | :--- |
| **`200 OK`** | Success | Request succeeded. User info updated, list fetched, action item status updated. |
| **`201 Created`** | Created | Resources created. New user account registered, new incident logged, department added. |
| **`400 Bad Request`** | Validation Failure | Missing mandatory fields (e.g. name, email, department) or invalid data formats. |
| **`401 Unauthorized`** | Authentication Failure | Missing JWT token, expired token, or invalid login credentials. |
| **`403 Forbidden`** | Privilege Violation | Action attempted by a role without permission, or deactivated user logging in. |
| **`404 Not Found`** | Resource Missing | Request targeting a user ID, incident ID, or department ID that does not exist in db. |
| **`409 Conflict`** | Resource Duplication | Creating a user with an Employee ID or Email address already stored in the system. |
| **`500 Internal Error`** | Server Failure | Database write errors, server-side exceptions, or SMTP server failure during dispatch. |

---
