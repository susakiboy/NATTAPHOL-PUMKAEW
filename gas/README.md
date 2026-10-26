# New Year Party Registration System 2027
## Production Architecture, Google Sheets Setup & Google Apps Script Deployment Guide

This document provides the complete technical specification, data dictionary, deployment guide, and security protocols for running the **New Year Party Registration System 2027** with **Google Sheets** as the persistent database and **Google Apps Script** as the serverless backend API.

---

### 1. System Architecture & Concurrency Model

```
+---------------------------------------------------------------+
|                      React Web Client                         |
|     (Thai Corporate UI / Registration / Admin Dashboard)      |
+-------------------------------+-------------------------------+
                                |
             JSON REST Calls    |    doGet / doPost
                                v
+---------------------------------------------------------------+
|               Google Apps Script Web App / Proxy              |
|                     (V8 Runtime Engine)                       |
|                                                               |
|  1. Input Sanitization (formula injection: =, +, -, @)        |
|  2. Active Factory & System Open Verification                 |
|  3. LockService.getScriptLock() (Guarantees Serial Order)     |
|  4. In-Lock Duplicate Check & Unassigned Number Selection     |
|  5. Atomic Write to Google Sheets & Flush                     |
|  6. Lock Release (finally block)                              |
+-------------------------------+-------------------------------+
                                |
                   SpreadsheetApp / DriveApp
                                v
+---------------------------------------------------------------+
|                    Google Sheets Database                     |
|  - Sheet 1: Registrations (Leading zeros '@' formatted)       |
|  - Sheet 2: Factories (Active/Inactive with Snapshot)         |
|  - Sheet 3: Settings (Min/Max Number Range, Event Name)       |
|  - Sheet 4: Admins (Authorized Email Allowlist)               |
|  - Sheet 5: AuditLogs (Audit Trail of all Admin Actions)      |
+---------------------------------------------------------------+
```

---

### 2. Google Sheets Schema Design

#### Sheet 1: `Registrations`
| Column | Header | Type | Note |
|---|---|---|---|
| A | Registration ID | Text | Unique prefix `REG-YYYYMMDD-HHmmss-XXXX` |
| B | Employee ID | Text (`@`) | **Leading zeros preserved** (e.g. `00101`, `00452`) |
| C | First Name | Text | Thai or English first name |
| D | Last Name | Text | Thai or English last name |
| E | Full Name | Text | Calculated full name |
| F | Department | Text | Employee department / division |
| G | Factory ID | Text | Reference to Factory ID |
| H | Factory Name Snapshot | Text | **Snapshot preserving original name even if renamed** |
| I | Assigned Number | Number | Unique random number within [min, max] |
| J | Registration Timestamp | DateTime | Bangkok timezone (`yyyy-MM-dd HH:mm:ss`) |
| K | Registration Status | Enum | `ACTIVE` หรือ `CANCELLED` |
| L | Updated Timestamp | DateTime | Last update timestamp |

#### Sheet 2: `Factories`
| Column | Header | Type | Note |
|---|---|---|---|
| A | Factory ID | Text | e.g. `FAC-01`, `FAC-02` |
| B | Factory Code | Text | e.g. `HQ`, `BKP`, `AYU` |
| C | Factory Name | Text | Display name |
| D | Active Status | Boolean | `TRUE` / `FALSE` |
| E | Created At | DateTime | ISO string |
| F | Updated At | DateTime | ISO string |

#### Sheet 3: `Settings`
| Column | Header | Note |
|---|---|---|
| A | Setting Key | `MIN_NUMBER`, `MAX_NUMBER`, `REGISTRATION_OPEN`, `EVENT_NAME`, `EVENT_YEAR`, `CONFIRMATION_MESSAGE`, `RETAIN_CANCELLED_NUMBERS` |
| B | Setting Value | Key value |
| C | Updated At | Timestamp |

#### Sheet 4: `Admins`
| Column | Header | Note |
|---|---|---|
| A | Admin ID | e.g. `ADM-01` |
| B | Admin Email | e.g. `jnsmedia.organizer@gmail.com` |
| C | Role | `SUPER_ADMIN` / `ADMIN` |
| D | Active Status | `TRUE` / `FALSE` |
| E | Created At | Timestamp |
| F | Updated At | Timestamp |

#### Sheet 5: `AuditLogs`
| Column | Header | Note |
|---|---|---|
| A | Log ID | e.g. `LOG-YYYYMMDD-XXXX` |
| B | Timestamp | Bangkok datetime |
| C | Admin Email | Email or `SYSTEM` / `PUBLIC` |
| D | Action | e.g. `ADD_FACTORY`, `UPDATE_SETTINGS`, `EXPORT_REPORT` |
| E | Target Type | e.g. `REGISTRATION`, `FACTORY`, `SETTINGS` |
| F | Target ID | Target identifier |
| G | Details | Audit notes |

---

### 3. Step-by-Step Deployment Instructions

#### Step 1: Create Google Spreadsheet
1. Open [Google Sheets](https://sheets.new) and create a new spreadsheet.
2. Name it: `New Year Party 2027 Database`.
3. Copy the Spreadsheet ID from the browser URL (e.g., `https://docs.google.com/spreadsheets/d/`**`1AbCdEfGhIjKlMnOp...`**`/edit`).

#### Step 2: Open Google Apps Script Editor
1. In Google Sheets, click menu **Extensions (ส่วนขยาย) > Apps Script**.
2. Rename the project to `NewYearParty2027_Backend`.

#### Step 3: Copy Code Files
Copy the 4 files from the `/gas/` folder into Apps Script:
- `/gas/Setup.gs` -> Create script file named `Setup.gs`
- `/gas/Api.gs` -> Create script file named `Api.gs`
- `/gas/Code.gs` -> Create script file named `Code.gs`
- `/gas/appsscript.json` -> In Project Settings, enable *"Show 'appsscript.json' manifest file in editor"* and paste its contents.

#### Step 4: Configure Script Properties
1. In Apps Script, click **Project Settings (การตั้งค่าโปรเจกต์ ⚙️)** on the left sidebar.
2. Scroll down to **Script Properties (คุณสมบัติของสคริปต์)** and click **Add script property**.
   - Property: `SPREADSHEET_ID`
   - Value: `<Your Google Sheet ID>`
3. (Optional) Add `ADMIN_PASSKEY` with value `NYP2027@AdminSecure`.

#### Step 5: Run Database Setup
1. In Apps Script editor, open `Setup.gs`.
2. Select function `setupDatabase` from the dropdown list.
3. Click **Run (เรียกใช้)**.
4. Authorize the necessary Google Permissions.
5. Check your Google Sheet: All 5 sheets will be created with styled Midnight Navy headers and default active factories!

#### Step 6: Deploy as Web App
1. Click **Deploy (ทำให้ใช้งานได้) > New deployment (การทำให้ใช้งานได้ใหม่)**.
2. Select type: **Web app (เว็บแอป)**.
3. Description: `Production v1`.
4. **Execute as**: `Me (บัญชีของฉัน)` *(This allows public users to register through your script without requiring individual Google Drive edit rights to your private sheet)*.
5. **Who has access**: `Anyone (ทุกคน)`.
6. Click **Deploy**.
7. Copy the **Web App URL** (e.g. `https://script.google.com/macros/s/AKfycb.../exec`).

#### Step 7: Connect the Frontend
1. In the web application, go to **Google Sheets & Code** menu.
2. Paste the Web App URL into the **Google Apps Script Web App URL** input.
3. Click **ทดสอบการเชื่อมต่อ (Test Connection)** and then **บันทึก URL (Save URL)**.
4. The system is now 100% connected live to Google Sheets!

---

### 4. Concurrency & Security Protocols

- **Atomic Number Allocation**: All assignment operations run inside `LockService.getScriptLock()` with a 30-second timeout. Simultaneous registrations are strictly serialized, eliminating duplicate ticket numbers.
- **Formula Injection Defense**: Any input starting with `=`, `+`, `-`, or `@` is rejected to prevent CSV/Sheet formula injection attacks.
- **Leading Zeros Preservation**: All employee IDs are formatted as text (`@` format) and written with an explicit string apostrophe prefix to ensure values like `00148` remain intact.
- **Historical Snapshot Guarantee**: Renaming or deactivating a factory never mutates historical registration records because the factory name snapshot is permanently captured at the moment of registration.
- **Excel XLSX Generation**: Exports are compiled as authentic binary `.xlsx` workbooks with column styling and auto-fit widths, rather than merely renamed CSVs.
