### High-level roadmap (multi‑stage)

- Stage 0 — Baseline and safety guardrails
  - Capture a baseline routes list and cold‑start timings; confirm tests pass.
  - Goal: a known-good baseline before any refactor.

- Stage 1 — Extract read-only “direct” endpoints from `backend/pharmago/urls.py`
  - Move only GET/read endpoints (stats, listings, simple detail) into a dedicated `api/direct` module and mount under the same `api/` prefix.
  - Goal: reduce file size and import surface with near-zero risk.

- Stage 2 — Extract file/document and AWS diagnostics endpoints
  - Move `document`/`storefront`/presigned URL and AWS diagnostics endpoints into an `api/files` or `api/global_api` urls module (same paths).
  - Goal: separate file/infra responsibilities and shrink project `urls.py` further.

- Stage 3 — Extract mutation “direct” endpoints (POST/PUT) by domain
  - Move rider/pharmacy approval, login-token, registration-completion, inventory mutations, order pricing/attachments, etc., into per‑app `urls.py` (or `api/direct`) keeping paths identical.
  - Goal: complete removal of business endpoints from project `urls.py`.

- Stage 4 — Extract dev chat endpoints behind DEBUG
  - Move chat dev endpoints to `api/chat/urls_dev.py` and include conditionally in DEBUG.
  - Goal: make debugging routes discoverable and isolated.

- Stage 5 — Unify and deduplicate app routing
  - Make `api/urls.py` delegate to per‑app `urls.py` (`api/orders/urls.py`, `api/inventory/urls.py`, etc.) and remove duplicated registrations inside `api/urls.py` where overlap exists.
  - Goal: single source of truth per app; `api/urls.py` becomes the v1 aggregator.

- Stage 6 — Finalize a tiny project `urls.py`
  - Keep only `admin/`, `api/` include for `api.urls`, healthcheck, and docs.
  - Goal: stable, conflict‑free top‑level routing.

- Stage 7 — Optional: tighten DX and reload stability
  - Ensure function‑level imports remain for heavy deps; add `watchdog` on Windows; exclude noisy dirs from autoreloader if needed.
  - Goal: faster cold starts and fewer spurious reloads.


### Detailed Stage 1 plan (do not execute yet)

- Scope to extract
  - Read‑only “direct” endpoints defined inline in `backend/pharmago/urls.py`:
    - `api/test/` (`test_api`)
    - `api/pharmacy-stats/` (`direct_pharmacy_stats`)
    - `api/pending-pharmacies/` (`direct_pending_pharmacies`)
    - `api/active-pharmacies/` (`direct_active_pharmacies`)
    - `api/rider-stats/` (`direct_rider_stats`)
    - `api/rider-details/<int:rider_id>/` (`direct_rider_details`)
  - Leave mutation endpoints, file/diagnostic, and chat dev endpoints for later stages.

- Files to create
  - `backend/api/direct/__init__.py`
  - `backend/api/direct/views_read.py`
    - Move the six read‑only view functions above into this file.
    - Preserve function‑level imports (e.g., importing models inside the function body) to avoid import‑time work and circular imports.
  - `backend/api/direct/urls.py`
    - Define routes with exactly the same paths and names as today, e.g.:
      - `path('pharmacy-stats/', views.direct_pharmacy_stats, ...)`
      - `path('rider-details/<int:rider_id>/', views.direct_rider_details, ...)`
    - Set `app_name = 'direct'` for namespacing hygiene.

- Files to update
  - `backend/pharmago/urls.py`
    - Remove the six paths listed above.
    - Add a single include that preserves paths:
      - `path('api/', include(('api.direct.urls', 'direct'), namespace='direct'))`
    - Keep all other routes unchanged, including `path('api/', include('api.urls'))` and docs (`api/schema`, `api/docs`, `api/redoc`).

- Cross-checks and stability notes
  - Ensure moved functions keep identical signatures and return values.
  - Keep function‑level imports to avoid heavy import‑time work.
  - Confirm no name collisions in URL names; if any, add namespace-qualified reverses (this change is internal and non‑breaking).

- Verification steps
  - Static checks:
    - Powershell:
      ```bash
      cd C:\Users\Ryan\Desktop\pharmago\backend
      .\venv\Scripts\python.exe manage.py check
      .\venv\Scripts\python.exe -X importtime manage.py check | Select-String -Pattern "import time" | Select-Object -First 40
      ```
  - Run tests:
    - If using pytest:
      ```bash
      .\venv\Scripts\pytest.exe -q
      ```
    - Or Django test runner:
      ```bash
      .\venv\Scripts\python.exe manage.py test -v 2
      ```
  - Smoke tests (server in noreload mode to rule out watcher noise):
    ```bash
    .\venv\Scripts\python.exe manage.py runserver --noreload
    ```
    - In another shell:
      ```bash
      curl http://127.0.0.1:8000/api/test/
      curl http://127.0.0.1:8000/api/pharmacy-stats/
      curl http://127.0.0.1:8000/api/pending-pharmacies/
      curl http://127.0.0.1:8000/api/active-pharmacies/
      curl http://127.0.0.1:8000/api/rider-stats/
      curl http://127.0.0.1:8000/api/rider-details/1/
      ```
    - Sanity check a v1 endpoint still works (unchanged pathing):
      ```bash
      curl http://127.0.0.1:8000/api/v1/system-health/
      ```

- Rollback plan
  - Single commit; revert with `git revert <commit>` to restore previous `urls.py` and remove `api/direct/` files if needed.

- Suggested commit message
  - Title: `refactor(urls): extract read-only direct endpoints from project urls into api.direct`
  - Body:
    - Move six GET endpoints to `api/direct/views_read.py`
    - Add `api/direct/urls.py` and include under `api/` prefix
    - Preserve paths and behavior; keep function-level imports to avoid import-time cost
    - No model or business logic changes


Would you like me to proceed with Stage 1 exactly as outlined?


### Progress (Stages 2–6)
- Stage 2: Extracted files/diagnostics into `api/files` (serve document/storefront, presigned URLs, prescription image, uploads, aws diagnostics). Project `urls.py` includes `api.files`.
- Stage 3: Moved user mutation direct endpoints into `api/users/direct_endpoints.py` and mounted via `api.users.urls_direct`.
- Stage 4: Moved DEBUG chat endpoints into `api/chat/dev_views.py`, mounted under `api/chat/urls_dev.py` only in DEBUG.
- Stage 5: Delegated app routing from `api/urls.py` to per‑app `urls.py` for `orders`, `inventory`, `payments`, `users`, `locations`, `pharmacies`, `notifications`, `chat`, and `global_api`. Checks passed; endpoints confirmed with smoke tests.
- Stage 6: Slimmed `backend/pharmago/urls.py` to admin, docs, `api.direct`, `api.files`, `api.users.urls_direct`, and `api.urls`. All direct endpoints removed from project file. Checks passed.

### Next steps
- Stage 7 (optional):
  - Add watchdog on Windows, keep heavy imports inside function bodies, exclude noisy dirs from autoreloader if needed.
  - Consider API version package `api/v1/` consolidation when ready for v2.


