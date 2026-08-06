# Ticket 09: Display restaurant badge for admin (list + header + picker)

## Changes

### Client
- `MessageModal.tsx`:
  - **Conversation list** ("Tất cả" tab): show restaurant name badge next to each conversation.
    - 1-1: badge = counterpart's restaurant name.
    - Group: badge = group's `restaurantId` resolved to restaurant name.
  - **Chat header**: show restaurant label next to counterpart name (1-1) or group name (group).
  - **1-1 member picker**: group users by restaurant name; each user shows restaurant label.

### Server
- `conversation.service.ts` — `getConversations()`:
  - Enrich `ConversationView` with `restaurantName` field (resolve from `restaurantId`).
  - For direct 1-1: `restaurantName` = counterpart's restaurant name.
  - For group: `restaurantName` = group's `restaurantId` resolved name.

### Test
- Test: admin sees restaurant badge in conversation list.
- Test: admin sees restaurant label in chat header.
- Test: admin sees users grouped by restaurant in 1-1 picker.