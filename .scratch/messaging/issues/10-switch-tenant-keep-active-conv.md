# Ticket 10: Switch tenant keeps active conversation

## Changes

### Client
- `use-messaging.tsx`:
  - When `activeRestaurantId` changes (tenant switch):
    - Do NOT close/reset active conversation.
    - Re-filter "Nội bộ" list to show only convs matching new `activeRestaurantId`.
    - "Tất cả" list remains unchanged.
    - If active conv is still in "Nội bộ" (counterpart in new restaurant) → stays visible.
    - If active conv moved to "Tất cả" only → user can still see it in "Tất cả" tab.

### Test
- Test: admin switches tenant → active conv preserved.
- Test: admin switches tenant → "Nội bộ" list updates correctly.