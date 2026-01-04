# Authentication API

Endpoints for session management and user administration. tRPC procedures live under the `auth` and `userManagement` routers.

## auth

### auth.me

- **Method & Path:** `GET /api/trpc/auth.me`
- **tRPC Type:** Query
- **Permissions:** Public (returns `null` when unauthenticated)
- **Input Schema:** _None_
- **Output Schema:** `User | null` (includes `id`, `openId`, `email`, `name`, `role`, `lastSignedIn`).
- **Example Request:**
  ```bash
  curl "<base-url>/api/trpc/auth.me" -H "Cookie: terp_session=<session>"
  ```
- **Example Response:**
  ```json
  {
    "result": {
      "data": {
        "json": {
          "id": 1,
          "email": "ops@terp.app",
          "name": "Ops User",
          "role": "admin"
        }
      }
    }
  }
  ```

### auth.logout

- **Method & Path:** `POST /api/trpc/auth.logout`
- **tRPC Type:** Mutation
- **Permissions:** Public (invalidates current session)
- **Input Schema:** _None_
- **Output Schema:** `{ success: boolean }`
- **Example Request:**
  ```bash
  curl -X POST "<base-url>/api/trpc/auth.logout" \
    -H "Cookie: terp_session=<session>" \
    -H "Content-Type: application/json" \
    -d '{"json":{}}'
  ```
- **Example Response:**
  ```json
  { "result": { "data": { "json": { "success": true } } } }
  ```

## userManagement

### userManagement.listUsers

- **Method & Path:** `GET /api/trpc/userManagement.listUsers`
- **tRPC Type:** Query
- **Permissions:** Public (intended for internal tooling; ensure network-level controls)
- **Input Schema:** _None_
- **Output Schema:** `Array<{ id: number; openId: string; email: string | null; name: string | null; lastSignedIn: Date; }>`
- **Example Response:**
  ```json
  {
    "result": {
      "data": {
        "json": [
          {
            "id": 1,
            "openId": "user-1",
            "email": "ops@terp.app",
            "name": "Ops User",
            "lastSignedIn": "2025-12-31T00:00:00.000Z"
          }
        ]
      }
    }
  }
  ```

### userManagement.createUser

- **Method & Path:** `POST /api/trpc/userManagement.createUser`
- **tRPC Type:** Mutation
- **Permissions:** Public (lock behind auth proxy in production)
- **Input Schema:**
  ```json
  {
    "username": "string (min 3)",
    "password": "string (min 4)",
    "name": "string | optional"
  }
  ```
- **Output Schema:** `{ success: true, user: { username: string, name: string } }`
- **Example Response:**
  ```json
  {
    "result": {
      "data": {
        "json": {
          "success": true,
          "user": { "username": "demo@terp.app", "name": "Demo" }
        }
      }
    }
  }
  ```

### userManagement.deleteUser

- **Method & Path:** `POST /api/trpc/userManagement.deleteUser`
- **tRPC Type:** Mutation
- **Permissions:** Public (use with caution; protect endpoint)
- **Input Schema:** `{ "username": "string" }`
- **Output Schema:** `{ success: true }`

### userManagement.resetPassword

- **Method & Path:** `POST /api/trpc/userManagement.resetPassword`
- **tRPC Type:** Mutation
- **Permissions:** Public (should be restricted in deployment)
- **Input Schema:**
  ```json
  { "username": "string", "newPassword": "string (min 4)" }
  ```
- **Output Schema:** `{ success: true }`

> **Note:** Lock the user management mutations behind operational controls in production. They intentionally skip permission checks for bootstrap flows.
