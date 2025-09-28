### URL Refactor Memory Guide (PharmaGo)

Purpose: Capture what changed, where things moved, and how to operate the system post‑refactor.

### Goals
- Reduce a 3k+ line `backend/pharmago/urls.py` into a tiny, maintainable entrypoint.
- Keep all public API paths unchanged for web and mobile.
- Improve dev stability (Windows file watching) and speed.

### High‑level outcome
- Project `urls.py` is now minimal and delegates to `urls_core.py`.
- All feature routes live in per‑app `urls.py` under `api/`.
- Public URLs are preserved (no changes required in web‑frontend or mobileapp).

### Final project URL shape
- `backend/pharmago/urls.py`: tiny delegator to `urls_core.py`.
- `backend/pharmago/urls_core.py`: mounts admin, docs, and API modules:
  - `api/ping/` (health ping)
  - `api/` → `api.direct.urls` (direct read‑only and details)
  - `api/` → `api.files.urls` (file serving, uploads, AWS diagnostics)
  - `api/` → `api.users.urls_direct` (user/rider/pharmacy direct mutations)
  - `api/` → `api.urls` (versioned v1 aggregator for all app APIs)
  - DEBUG only: `api/` → `api.chat.urls_dev` (dev chat helpers)

### Where things moved (old → new)
- Direct, read‑only endpoints (unchanged paths)
  - `api/test/`, `api/pharmacy-stats/`, `api/pending-pharmacies/`, `api/active-pharmacies/`, `api/rider-stats/`, `api/rider-details/<id>/`, `api/pharmacy-details/<id>/`
  - New home: `backend/api/direct/views_read.py`, routes in `backend/api/direct/urls.py`

- Files, images, and AWS diagnostics (unchanged paths)
  - `api/document/<id>/`, `api/pharmacy-storefront/<id>/`, `api/document-presigned/<id>/`, `api/prescription-image/<order_id>/`, `api/upload-prescription-image/`, `api/upload-driver-license/`, `api/aws-diagnostics/`
  - New home: `backend/api/files/views.py`, routes in `backend/api/files/urls.py`

- User‑side direct mutations (unchanged paths)
  - `api/approve-rider/<id>/`, `api/complete-rider-registration/`, `api/approve-pharmacy/<id>/`, `api/generate-login-token/<id>/`, `api/validate-login-token/<token>/`
  - New home: `backend/api/users/direct_endpoints.py`, routes in `backend/api/users/urls_direct.py`

- Dev chat helpers (DEBUG‑only; unchanged paths)
  - `api/order-chat-room/`, `api/order-chat-messages/`, `api/order-chat-typing/`, `api/order-chat-typing-status/`, `api/order-chat-mark-read/`, `api/order-chat-send/`, `api/order-chat-send-customer/`
  - New home: `backend/api/chat/dev_views.py`, routes in `backend/api/chat/urls_dev.py` (included only when `DEBUG=True`)

- Versioned API aggregation (`/api/v1/…`)
  - Prior inline blocks in `api/urls.py` now delegate to per‑app `urls.py`:
    - `orders`: `backend/api/orders/urls.py`
    - `inventory`: `backend/api/inventory/urls.py`
    - `payments`: `backend/api/payments/urls.py`
    - `users` (viewsets + auth): `backend/api/users/urls.py`
    - `locations`: `backend/api/locations/urls.py`
    - `pharmacies`: `backend/api/pharmacies/urls.py`
    - `notifications`: `backend/api/notifications/urls.py`
    - `chat`: `backend/api/chat/urls.py`
    - `global_api`: `backend/api/global_api/urls.py`

### Public API compatibility
- Web and mobile continued working without changes.
- All endpoints under `/api/v1/…` and direct endpoints under `/api/…` retained their paths and behaviors.

### Developer experience improvements
- Added `watchdog==4.0.2` to `backend/requirements.txt`; Django uses it automatically on Windows for reliable file watching.
- `README-DEV.md` updated with Windows DX tips (noreload usage, PowerShell curl, per‑session AWS env vars when `.env` is immutable).

### Smoke tests (examples)
- Direct read‑only:
  - `GET /api/test/` → 200
  - `GET /api/rider-details/6/` → 200 (404 if id not found)
- Files/diagnostics:
  - `GET /api/document/9/` → 302/200 depending on S3; `GET /api/aws-diagnostics/` → 200 with creds, 500 otherwise
- Orders (auth required):
  - `GET /api/v1/orders/` → 403 unauth; 200 with valid token
- Inventory:
  - `GET /api/v1/inventory/categories/root/` → 200

### How to run locally (hybrid)
1) Services: `docker-compose -f docker-compose.services.yml up -d`
2) Backend (from `backend/`): `venv\Scripts\activate` → `python manage.py runserver`
3) Frontend: `npm start`

### Rollback guidance
- Changes were staged by area. To revert a group, remove the corresponding `include()` and restore the prior function/paths (git revert recommended).
  - Direct endpoints: remove `api.direct` include; restore specific paths if needed.
  - Files/diagnostics: remove `api.files` include; restore file‑serving paths.
  - Users direct: remove `api.users.urls_direct` include; restore direct mutation paths.
  - Per‑app delegation: revert `api/urls.py` to inline blocks for the specific app.
  - Project entrypoint: revert `backend/pharmago/urls.py` to previous content (not recommended).

### Next steps (optional)
- Consider formal `api/v1/` package for long‑term versioning and add `v2` safely later.
- Keep heavy imports/DB calls inside functions to minimize import‑time work.
- If reloads seem noisy, run with `--noreload` during long profiling sessions.


