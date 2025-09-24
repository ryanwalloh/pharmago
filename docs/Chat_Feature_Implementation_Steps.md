## Chat Feature Implementation Steps

### Overview
This plan delivers an order-scoped chat between pharmacy and customer in small, verifiable increments. We will reuse the existing backend chat models (`ChatRoom` → order, `ChatParticipant`, `ChatMessage`) and progressively enable the feature in the web-frontend (pharmacy dashboard) and the mobile customer app. After each major milestone, run a brief test before moving forward.

### Architecture (at a glance)
- Chat is order-scoped via `ChatRoom.order`.
- Users join via `ChatParticipant` with roles (pharmacy, customer, etc.).
- Messages are `ChatMessage` rows. Initial transport uses simple polling; realtime can be added later.

## Phase 0 — Baseline UI and Guardrails
### 0.1 Add chat panel toggle in pharmacy review modal (DONE)
- Left panel switches between prescription image and chat placeholder.
- Composer disabled; indicates "Chat will be enabled after setup".

### 0.2 Testing
- Open a prescription order → toggle between Image/Chat without errors.

## Phase 1 — Backend: Room Get-or-Create (Order-Scoped) (DONE)
### 1.1 Endpoint (dev-friendly, minimal risk)
- Add a direct backend endpoint (bypasses auth like other dev endpoints) to get-or-create a `ChatRoom` by `order_id`:
  - Creates room if none.
  - Ensures `pharmacy user` and `customer user` are participants.
  - Returns `room.id`, `room.room_id`, `order_id`.

Status: DONE

Implementation notes:
- Added POST `/api/order-chat-room/` (dev) in `backend/pharmago/urls.py`:
  - Finds or creates `ChatRoom(order=Order(id=...))`.
  - Ensures `ChatParticipant` for `order.customer.user` (role=customer) and `pharmacy.user` (role=pharmacy, resolved via first order line or `pharmacy_id` fallback).
  - Emits a `ChatMessage.create_system_message` on first create: “Chat room created for Order #...”.
  - Response: `{ success, room: { id, room_id, order_id, title, status } }`.

### 1.2 Testing
- curl POST with `{ order_id }` → verify response and room exists in DB.
- Confirm both participants exist for the room.

Result: Verified; system message appears and participants created as expected.

## Phase 2 — Web Frontend: Wire Room Lookup (DONE)
### 2.1 When clicking “Open Chat with Customer”
- Call Phase 1 endpoint with `selectedOrder.id`.
- Store `roomId` in state; keep rendering placeholder in the left panel.

Status: DONE

Implementation notes:
- In `web-frontend/src/components/PharmacyDashboard.js`, the modal’s “Open Chat with Customer” button:
  - Calls POST `/api/order-chat-room/` with `{ order_id, pharmacy_id }`.
  - Stores `chatRoom` in state and flips `showChatPanel=true` (left panel becomes chat view placeholder at first).
  - Immediately fetches messages (Phase 4) and starts 12s polling.

### 2.2 Testing
- Devtools → network success, state set with `roomId`.
- No UI errors.

Result: Confirmed; room loads and UI toggles to chat panel.

## Phase 3 — Backend: List Messages for a Room (DONE)
### 3.1 Endpoint (dev-friendly bridge)
- Provide a direct endpoint (or reuse `/api/chat-rooms/{id}/messages/` if we wire auth) returning latest N messages sorted asc by time.

Status: DONE

Implementation notes:
- Added GET `/api/order-chat-messages/?room_id=ROOM_ID&limit=50` in `backend/pharmago/urls.py`.
  - Returns `{ success, room: { id, room_id }, count, messages: [{ id, sender_name, sender_role, message_type, content, timestamp, is_system_message }] }` ordered by timestamp ascending.

### 3.2 Testing
- Seed a system message (e.g., “Room created…”) in that room.
- curl GET messages → verify JSON list and ordering.

Result: Confirmed; system message returned and ordering correct.

## Phase 4 — Web Frontend: Render Messages (Read-only) (DONE)
### 4.1 Render message list
- In chat panel, fetch messages on mount (and on 10–15s polling).
- Show sender name/role, content, timestamp; auto-scroll to bottom.

Status: DONE

Implementation notes:
- In `PharmacyDashboard.js` chat panel:
  - Fetches from `/api/order-chat-messages/` when opening chat; polls every 12s.
  - Auto-scroll to bottom after updates.

### 4.2 Testing
- Confirm messages display and poll updates; timestamps render as expected.

Result: Confirmed; message list updates and auto-scroll works.

## Phase 5 — Backend: Send Message (Pharmacy) (DONE)
### 5.1 Endpoint (dev-friendly)
- Add a direct endpoint to create a `ChatMessage` in a room on behalf of the pharmacy user:
  - Ensures the pharmacy user is a participant (create if needed).
  - Validates non-empty `content` for `text` messages.
  - Returns the created message summary.

Status: DONE

Implementation notes:
- Added POST `/api/order-chat-send/` in `backend/pharmago/urls.py`:
  - Body: `{ room_id, pharmacy_id, content }`.
  - Ensures pharmacy participant; creates `ChatMessage(message_type='text')` and marks delivered.
  - Returns `{ success, message: { id, sender_name, sender_role, content, timestamp } }`.

### 5.2 Testing
- curl POST send message → verify persisted message; subsequent list shows it.

Result: Confirmed; messages persisted and list endpoint shows them.

## Phase 6 — Web Frontend: Enable Composer (Pharmacy) (DONE)
### 6.1 Hook send
- Enable the input and Send button.
- POST to Phase 5 endpoint, optimistically append to list, then refetch.
- Handle errors (retry, toast/log).

Status: DONE

Implementation notes:
- In `PharmacyDashboard.js`:
  - Text input enables Enter-to-send.
  - Optimistic append for snappy UX; reconciles by refetching from `/api/order-chat-messages/`.
  - Auto-scrolls to bottom after send.

### 6.2 Testing
- Send a few messages; they should appear and persist across refresh.

Result: Confirmed; messages appear instantly and persist after refresh.

## Phase 7 — Mobile App (Customer): Read-Only Messages (DONE)
### 7.1 Screen & navigation
- Add `OrderChatScreen` reachable from order details.
- Fetch room by `order_id` (same get-or-create logic), then fetch messages.

Status: DONE

Implementation notes:
- Used existing chat icon in `OrderTrackingScreen.tsx` as entry point.
- Opens a full-width, bottom-aligned modal (touching left/right/bottom) that:
  - Calls POST `/api/order-chat-room/` to get/create room.
  - Fetches messages via `/api/order-chat-messages/` and starts 12s polling while open.

### 7.2 Testing
- Launch app → open an order → confirm messages visible and updated by pull-to-refresh.

Result: Confirmed; system message and pharmacy messages visible, polling active.

## Phase 8 — Mobile App (Customer): Send Message (DONE)
### 8.1 Enable composer
- POST send message in the room as the customer user.
- Append locally and refetch list.

Status: DONE

Implementation notes:
- Added POST `/api/order-chat-send-customer/` (dev) to send messages as customer.
- In `OrderTrackingScreen.tsx` chat modal:
  - TextInput composer + Send button.
  - Sends via new endpoint; clears input, refetches messages, and auto-scrolls.

### 8.2 Testing
- Exchange messages between pharmacy web and customer app; verify both sides receive them.

Result: Confirmed; both sides can send/receive, with polling keeping the view updated.

## Phase 9 — Quality & UX Iterations
### 9.1 Message status & read receipts
- Use mark-as-read endpoint when chat panel is focused.
- Style delivered/read ticks (optional visual).

### 9.2 Typing indicator (optional)
- MVP: Debounced “typing…” flag stored in room metadata and cleared after timeout.

### 9.3 Attachments (optional)
- Extend send to support `image/file` with upload → message includes `file_path` and `file_type`.

### 9.4 Testing
- Verify status transitions; send/receive read events; optional typing/attachments.

## Phase 10 — Realtime (Optional, Later)
### 10.1 Transport upgrade
- Move from polling to WebSocket/SSE for live updates.
- Subscribe by `room_id`.

### 10.2 Testing
- Open two clients → messages appear instantly without polling.

## Phase 11 — Permissions, Security, and Auditing
### 11.1 Tighten access
- Replace dev endpoints with authenticated routes.
- Ensure only participants can access a room and messages.

### 11.2 Logging & retention
- Add structured logs for message events.
- Optional retention/archival policy.

### 11.3 Testing
- Attempt unauthorized access; ensure 403/404.
- Confirm logs are recorded as designed.

## Phase 12 — Rollout & Monitoring
### 12.1 Feature flag
- Gate chat behind a flag; enable for a test pharmacy first.

### 12.2 Monitoring & alerts
- Track room/message counts, latency, error rates.

### 12.3 Testing
- Canary rollout checks; rollback plan prepared.

## API Shapes (reference)
### Get/Create Room (dev)
Request:
```json
{ "order_id": 123 }
```
Response:
```json
{ "success": true, "room_id": 45, "order_id": 123 }
```

### List Messages (dev)
Response:
```json
{ "success": true, "messages": [ { "id": 1, "sender_name": "Pharmacy", "content": "Hello" } ] }
```

### Send Message (dev)
Request:
```json
{ "room_id": 45, "message_type": "text", "content": "Hello" }
```
Response:
```json
{ "success": true, "message": { "id": 99, "content": "Hello" } }
```

## Data Mapping Checklist
- `Order.id` → `ChatRoom.order`.
- Pharmacy web: map current pharmacy user to `ChatParticipant(role=pharmacy)`.
- Customer app: map logged-in customer to `ChatParticipant(role=customer)`.

## Risks & Mitigations
- Auth mismatch between dev endpoints and DRF viewsets → use dev bridges first, retrofit auth later.
- Realtime complexity → defer to polling first.
- Message ordering/timezones → always sort by `timestamp`; display local time via client.

## Definition of Done (MVP)
- Pharmacy and customer can exchange text messages in an order-scoped room.
- Messages persist and reload on both clients.
- Basic read marks and polling in place.

