# Friends & Circle API Contract

## Auth

All endpoints require `Authorization: Bearer <token>`.

## Friends

### POST `/api/v1/friends/add-by-code`

Body:

```json
{ "code": "vamshi#7392" }
```

Rules:
- Code must exist.
- User cannot add self.
- Duplicate pending/accepted requests are rejected.

### GET `/api/v1/friends`

Response includes:
- `friends`: accepted relationships
- `pending`: incoming/outgoing pending requests

### POST `/api/v1/friends/accept`

Body:

```json
{ "requestId": "..." }
```

### POST `/api/v1/friends/reject`

Body:

```json
{ "requestId": "..." }
```

## Circles

### POST `/api/v1/circles/create`

Body:

```json
{ "name": "Evening Circle", "memberIds": ["userId1", "userId2"] }
```

Rules:
- 2-10 members including creator.
- Added users must be accepted friends.
- Creator is `admin`.

### GET `/api/v1/circles`

Returns circles where requester is a member.

### POST `/api/v1/circles/add-member`

Body:

```json
{ "circleId": "...", "memberUserId": "..." }
```

### POST `/api/v1/circles/remove-member`

Body:

```json
{ "circleId": "...", "memberUserId": "..." }
```

### GET `/api/v1/circles/:id/settings`

Returns:

```json
{ "settings": { "circleId": "...", "liveNotificationsEnabled": false } }
```

### POST `/api/v1/circles/:id/settings`

Body:

```json
{ "liveNotificationsEnabled": true }
```

Rules:
- Circle admin only.
- Default is `false`.

## Entries (extended)

### POST `/api/v1/entries`

Body:

```json
{
  "brand": "Gold Flake",
  "quantity": 1,
  "timestamp": 1710000000000,
  "cost": 18,
  "shareToCircle": true,
  "circleId": "circleId"
}
```

Rules:
- If `shareToCircle=true`, `circleId` is required.
- User must be a member of `circleId`.
- Live notification is triggered only when circle setting is enabled.
