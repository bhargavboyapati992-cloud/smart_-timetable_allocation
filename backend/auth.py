"""
auth.py — VIMS Portal Authentication Layer
==========================================
Supports:
  - Username + Password login
  - Grid-code challenge (two dynamic values provided by college)
  - JWT tokens issued on success, required for all protected API routes

CONFIGURATION (set in backend/.env):
  SECRET_KEY        = any long random string  (change before production!)
  GRID_CHALLENGE_1  = label shown to staff, e.g. "B3"
  GRID_VALUE_1      = correct answer for challenge 1, e.g. "7X"
  GRID_CHALLENGE_2  = label shown to staff, e.g. "D5"
  GRID_VALUE_2      = correct answer for challenge 2

STAFF ACCOUNTS:
  Edit STAFF_USERS below or point to a staff_config.json for the other team.
  Password field stores plain text for simplicity; the other team may
  replace verify_password() with bcrypt/LDAP calls as needed.
"""

import os, json, datetime
from pathlib import Path
from typing import Optional
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from dotenv import load_dotenv

load_dotenv()

# ── Configuration ──────────────────────────────────────────────────────────────
SECRET_KEY        = os.getenv("SECRET_KEY", "CHANGE_ME_IN_PRODUCTION_RANDOM_SECRET")
ALGORITHM         = "HS256"
TOKEN_EXPIRE_HRS  = 8          # session lasts 8 hours

GRID_CHALLENGE_1  = os.getenv("GRID_CHALLENGE_1", "B3")  # shown on login UI
GRID_VALUE_1      = os.getenv("GRID_VALUE_1", "").strip().upper()

GRID_CHALLENGE_2  = os.getenv("GRID_CHALLENGE_2", "D5")  # shown on login UI
GRID_VALUE_2      = os.getenv("GRID_VALUE_2", "").strip().upper()

# ── Staff Registry ─────────────────────────────────────────────────────────────
# Loaded from staff_config.json if it exists, otherwise falls back to this list.
# Each entry: { "username": "...", "password": "...", "department_id": "...", "role": "staff|admin" }

_DEFAULT_STAFF = [
    {"username": "admin",      "password": "admin123",  "department_id": "admin",  "role": "admin", "display_name": "Administrator"},
    {"username": "hod_cse",    "password": "vims@2024", "department_id": "cse",    "role": "staff", "display_name": "HOD - CSE"},
]

def _load_staff():
    config_path = Path(__file__).parent / "staff_config.json"
    if config_path.exists():
        with open(config_path) as f:
            return json.load(f)
    return _DEFAULT_STAFF

STAFF_USERS = _load_staff()

# Google OAuth
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")

# ── Helpers ────────────────────────────────────────────────────────────────────

def verify_password(plain: str, stored: str) -> bool:
    """Plain comparison — replace with bcrypt or LDAP hook if the portal team requires."""
    return plain.strip() == stored.strip()


def authenticate_user(username: str, password: str, grid1: str, grid2: str) -> dict:
    """
    Validates all four factors and returns the staff record on success.
    Raises HTTPException on any failure.
    """
    user = next((u for u in STAFF_USERS if u["username"].lower() == username.lower()), None)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Grid challenge (only enforced if the env values are set)
    if GRID_VALUE_1 and grid1.strip().upper() != GRID_VALUE_1:
        raise HTTPException(status_code=401, detail=f"Incorrect grid value for {GRID_CHALLENGE_1}")

    if GRID_VALUE_2 and grid2.strip().upper() != GRID_VALUE_2:
        raise HTTPException(status_code=401, detail=f"Incorrect grid value for {GRID_CHALLENGE_2}")

    return user


def create_access_token(user: dict) -> str:
    expire = datetime.datetime.utcnow() + datetime.timedelta(hours=TOKEN_EXPIRE_HRS)
    payload = {
        "sub":           user["username"],
        "department_id": user["department_id"],
        "role":          user["role"],
        "exp":           expire,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Session expired — please log in again")


# ── FastAPI dependency ─────────────────────────────────────────────────────────
_bearer = HTTPBearer(auto_error=False)

def require_auth(credentials: Optional[HTTPAuthorizationCredentials] = Security(_bearer)) -> dict:
    """
    FastAPI dependency. Drop-in on any route:
        @app.get("/protected")
        def view(user = Depends(require_auth)):
            ...
    Returns the decoded JWT payload (includes username, department_id, role).
    """
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return decode_token(credentials.credentials)


# ── Account Mutation Helpers ───────────────────────────────────────────────────

_CONFIG_PATH = Path(__file__).parent / "staff_config.json"

def _save_staff(users: list):
    """Persist STAFF_USERS back to staff_config.json and refresh in-memory list."""
    global STAFF_USERS
    with open(_CONFIG_PATH, "w") as f:
        json.dump(users, f, indent=2)
    STAFF_USERS = users


def change_password(username: str, new_password: str) -> None:
    """Update password for the given username. Raises HTTPException if not found."""
    users = list(STAFF_USERS)
    user = next((u for u in users if u["username"].lower() == username.lower()), None)
    if not user:
        raise HTTPException(status_code=404, detail="Username not found")
    user["password"] = new_password.strip()
    _save_staff(users)


def change_username(old_username: str, password: str, new_username: str) -> None:
    """Rename a username after verifying the current password."""
    users = list(STAFF_USERS)
    user = next((u for u in users if u["username"].lower() == old_username.lower()), None)
    if not user:
        raise HTTPException(status_code=401, detail="Current username or password is incorrect")
    if not verify_password(password, user["password"]):
        raise HTTPException(status_code=401, detail="Current username or password is incorrect")
    # Ensure new username is not already taken
    if any(u["username"].lower() == new_username.lower() for u in users if u is not user):
        raise HTTPException(status_code=409, detail="That username is already taken")
    user["username"] = new_username.strip()
    _save_staff(users)


def register_user(username: str, password: str, department_id: str, display_name: str = "") -> dict:
    """Create a new staff account and persist it."""
    users = list(STAFF_USERS)
    if any(u["username"].lower() == username.lower() for u in users):
        raise HTTPException(status_code=409, detail="Username already exists. Please choose another.")
    if len(password.strip()) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    new_user = {
        "username":      username.strip(),
        "password":      password.strip(),
        "department_id": department_id.strip().lower().replace(" ", "_"),
        "role":          "staff",
        "display_name":  display_name.strip() or username.strip(),
    }
    users.append(new_user)
    _save_staff(users)
    return new_user


def google_login(id_token_str: str) -> dict:
    """
    Verify a Google ID token, then find or auto-create the staff account.
    Requires GOOGLE_CLIENT_ID in .env.
    """
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=501, detail="Google Sign-In is not configured on this server")
    try:
        from google.oauth2 import id_token as google_id_token
        from google.auth.transport import requests as google_requests
        id_info = google_id_token.verify_oauth2_token(
            id_token_str, google_requests.Request(), GOOGLE_CLIENT_ID
        )
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Google token invalid: {e}")

    email = id_info.get("email", "")
    name  = id_info.get("name", email.split("@")[0])
    # Use email prefix as username
    username = email.split("@")[0].replace(".", "_")
    dept_id  = username  # each Google user is their own department partition

    # Find or auto-create
    users = list(STAFF_USERS)
    user  = next((u for u in users if u.get("google_email") == email), None)
    if not user:
        user = next((u for u in users if u["username"].lower() == username.lower()), None)
    if not user:
        user = {
            "username":      username,
            "password":      "",
            "department_id": dept_id,
            "role":          "staff",
            "display_name":  name,
            "google_email":  email,
        }
        users.append(user)
        _save_staff(users)
    return user
