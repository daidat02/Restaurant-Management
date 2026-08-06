# Ticket 07: Add/remove group members via chat header

## Changes

### Server
- New route: `POST /api/conversations/:id/members`
  - Middleware: `verifyToken`, `requireResourceTenant(conversationTenantResolver)`
  - Body: `{ memberIds: string[] }`
  - Validate: caller must be group creator (role `admin` in members array).
  - Validate: each new member must belong to group's `restaurantId`.
  - Validate: no duplicate members.
  - Persist → emit `conversation_updated` to all current members via `user_<id>` rooms.

- New route: `DELETE /api/conversations/:id/members/:userId`
  - Middleware: `verifyToken`, `requireResourceTenant(conversationTenantResolver)`
  - Validate: caller must be group creator.
  - Validate: cannot remove self.
  - Persist → emit `conversation_updated` to remaining members.

### Client
- `MessageModal.tsx` — group header:
  - Show avatar stack of members (max 3 visible + `+N` badge).
  - Show "Thêm thành viên" button (only creator sees).
  - Click → open modal with:
    - Filter users by group's `restaurantId`.
    - Already-selected members shown with "X" remove button.
    - "Lưu" button to confirm changes.
  - On save → call `POST /:id/members` or `DELETE /:id/members/:userId`.
  - On success → update local state + emit `conversation_updated` via socket (optimistic).

### Test
- Test: creator adds member to group → 200, member appears in conversation.
- Test: non-creator tries to add member → 403.
- Test: creator removes member → 200, member removed from conversation.
- Test: creator cannot remove self → 400.