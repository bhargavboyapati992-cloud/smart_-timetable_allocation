# VIMS Timetable System — Integration Guide
## For the Portal Integration Team

---

## What This System Does

This is an AI-powered timetable generator for VIMS staff. Once deployed, staff log in with their username, password, and two **grid card values** provided by the college. After authentication, the system generates conflict-free timetables for each department.

---

## Authentication Flow

```
Staff → Login (username + password + grid B3 + grid D5)
      → Backend validates → Issues JWT token (8 hours)
      → All subsequent API calls carry: Authorization: Bearer <token>
      → Token expires → Staff is redirected to login again
```

---

## Files to Configure

### 1. `backend/staff_config.json` — Staff Accounts

Edit this file to add real staff accounts. Each entry:

```json
[
  {
    "username":      "hod_cse",
    "password":      "their_real_password",
    "department_id": "cse",
    "role":          "staff",
    "display_name":  "Prof. Bhargav — CSE"
  }
]
```

- `username` — what staff types at login
- `password` — plain text (or swap `verify_password()` in `auth.py` for LDAP/SSO)
- `department_id` — data namespace; staff only see their own department's data
- `role` — `staff` or `admin`

---

### 2. `backend/.env` — Environment Variables

Copy `.env.example` → `.env` and fill in:

| Variable | Description | Example |
|---|---|---|
| `SECRET_KEY` | Long random string for JWT signing | `openssl rand -hex 32` |
| `DATABASE_URL` | Postgres connection string | `postgresql://user:pass@host/db` |
| `GRID_CHALLENGE_1` | Grid cell label shown to staff | `B3` |
| `GRID_VALUE_1` | Expected answer for that cell | `7X` |
| `GRID_CHALLENGE_2` | Second grid cell label | `D5` |
| `GRID_VALUE_2` | Expected answer | `P3` |

**Leaving `GRID_VALUE_1` / `GRID_VALUE_2` blank disables that check** (useful for testing).

---

### 3. `frontend/.env` — Frontend Config

Create a file `frontend/.env`:

```env
VITE_API_URL=https://your-backend-domain.com
```

This is the only change needed on the frontend side for any deployment.

---

## How to Run

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env        # fill in values
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm install
echo "VITE_API_URL=http://localhost:8000" > .env
npm run dev
```

---

## API Summary (for portal team reference)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/auth/challenges` | ❌ Public | Returns grid cell labels for login UI |
| POST | `/auth/login` | ❌ Public | Returns JWT on success |
| POST | `/auth/logout` | ✅ JWT | Clears session (frontend deletes token) |
| GET | `/teachers/` | ✅ JWT | List teachers for a department |
| POST | `/teachers/` | ✅ JWT | Add a teacher |
| GET | `/rooms/` | ✅ JWT | List rooms |
| POST | `/rooms/` | ✅ JWT | Add a room |
| GET | `/subjects/` | ✅ JWT | List subjects |
| POST | `/subjects/` | ✅ JWT | Add a subject |
| GET | `/tas/` | ✅ JWT | List Teaching Assistants |
| POST | `/tas/` | ✅ JWT | Add a TA |
| GET/PUT | `/config/` | ✅ JWT | Constraints config |
| POST | `/generate` | ✅ JWT | Run AI timetable solver |

Protected routes require header: `Authorization: Bearer <token>`

---

## Embedding Into VIMS Portal (iframe approach)

If the portal team wants to embed this inside an existing VIMS page:

```html
<!-- In your existing VIMS portal page -->
<iframe
  src="https://timetable.vims.edu.in"
  style="width:100%; height:100vh; border:none;"
  allow="same-origin"
></iframe>
```

The app handles its own login internally — no SSO wiring needed unless desired.

### For SSO / SAML / OAuth Integration

If VIMS portal already has SSO, the `auth.py` file has a clear swap point:

```python
def verify_password(plain: str, stored: str) -> bool:
    # Replace this body with your LDAP / SAML / OAuth call
    return plain.strip() == stored.strip()
```

---

## Deployment Checklist

- [ ] Fill in `backend/staff_config.json` with real staff accounts
- [ ] Set `SECRET_KEY` in `.env` to a random 64-char string
- [ ] Set `DATABASE_URL` to production Postgres
- [ ] Set grid challenge values (`GRID_CHALLENGE_1/2` + `GRID_VALUE_1/2`)
- [ ] Set `VITE_API_URL` in frontend `.env` to production backend URL
- [ ] Configure CORS in `main.py` `allow_origins` to only allow your portal domain
- [ ] Run `pip install -r requirements.txt` after first deploy
- [ ] Restart backend after changing `.env`
