# Ticket 08: Admin tabs "Nội bộ" / "Tất cả" + cross-chain 1-1

## Changes

### Server
- `conversation.service.ts` — `getConversations()`:
  - No change needed. Already returns all conversations for user across `restaurantIds`.
  - Client filters by tab.

- `conversation.service.ts` — `createConversation()`:
  - `findDirect()` currently scopes by `restaurantId`. For cross-chain admin 1-1, need to dedupe by user pair regardless of restaurant.
  - Update `conversation.repository.ts` — `findDirect()`: add overload without `restaurantId` param, or change to find by user pair only.
  - New `findDirectByPair(userA, userB)` → finds direct conv between exactly these 2 users (any restaurant).

### Client
- `MessageModal.tsx` — tab bar:
  - Manager/staff: single tab "Nội bộ" (no tab UI needed, or single tab label).
  - Admin: 2 tabs — "Nội bộ" (active restaurant) + "Tất cả" (all chain).
  - Tab switch triggers conversation list re-filter.

- `MessageModal.tsx` — conversation list:
  - "Nội bộ" tab: filter conversations where counterpart (1-1) or group's `restaurantId` matches `activeRestaurantId`.
  - "Tất cả" tab: show all conversations admin is member of.
  - Each item shows **restaurant badge** (name of counterpart's/group's restaurant) for admin.

- `MessageModal.tsx` — 1-1 member picker for admin:
  - When creating 1-1, show all chain employees grouped by restaurant name.
  - Each user has a small badge showing their restaurant name.
  - Admin selects any user → creates direct conv with `restaurantId` = counterpart's primary restaurant.

### Client hooks
- `use-messaging.tsx`:
  - Add `activeTab` state (`'noi-bo' | 'tat-ca'`), default `'noi-bo'`.
  - Filter conversations based on active tab + `activeRestaurantId`.
  - When admin switches tenant, keep active conversation intact; update "Nội bộ" list.

### Test
- Test: admin sees "Nội bộ" + "Tất cả" tabs.
- Test: cross-chain 1-1 appears in "Tất cả" but not "Nội bộ" (when admin is in different restaurant).
- Test: cross-chain 1-1 appears in "Nội bộ" when admin switches to counterpart's restaurant.