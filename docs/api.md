# API plan

The API is organized under `/api/v1` and will cover:

- `auth`
- `users`
- `providers`
- `services`
- `requests`
- `bookings`
- `messages`
- `notifications`
- `payments`
- `reviews`
- `disputes`
- `admin`
- `ai`
- `health`

## Response format
- `success: true|false`
- `data` for successful responses
- `error` object for failures

## Auth requirements
- JWT-based authentication for user sessions
- Role enforcement on each protected endpoint
- All sensitive admin actions must be logged
