# Ticket 06: Fix group creation — name only (no member pre-selection)

**Blocker:** Admin cannot create group conversation because member picker requires selecting members from the same restaurant, but admin sees all chain employees.

## Changes

### Server
- `conversation.service.ts` — `createConversation()`:
  - Remove hard `memberIds.length === 0` check at the top.
  - When `type === 'group'` and `memberIds` is empty/undefined → create group with only creator as member.
  - When `memberIds` is provided (backward compat) → validate each member belongs to `restaurantId`.
  - Group still requires `name` (non-empty).

### Client
- `MessageModal.tsx` — group creation form:
  - Remove member selection step.
  - Only input: group name.
  - After create → auto-join conversation → open chat → show header with "Thêm thành viên" button.

### Test
- Test: create group with name only → 201, only creator in members.
- Test: create group with name + memberIds (backward compat) → still works.