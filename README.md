# MongoDB User Management Dashboard

An Express + React application for managing MongoDB users and roles with built-in URI validation, temporary users, and a modern web dashboard.

## Features

- **Cluster connection panel**: Paste any standard MongoDB connection string or type `demo` to explore the UI with safe sample data.
- **Smart URI handling**: Server-side validation and normalization of MongoDB URIs, with support for both `mongodb://` and `mongodb+srv://` schemes.
- **Dashboard for users**: List MongoDB users, see creation metadata, and distinguish temporary users with expiry information.
- **User lifecycle management**:
  - Create users with roles.
  - Create time-limited temporary users with automatic cleanup.
  - Update passwords and roles.
  - Delete users with safeguards for root/administrative accounts and the last remaining user.
- **Role management**:
  - Inspect built-in roles and their groupings.
  - Create, update, and delete custom roles backed by MongoDB.
  - Use an actions tree as the source of truth for fine-grained privileges.
- **Optional admin authentication**: Protect the dashboard with HTTP Basic auth controlled by environment variables.
- **Demo mode**: Explore the interface and flows without connecting to a real MongoDB deployment.

## Architecture

- **Backend**: Node.js + Express server (TypeScript, built to `dist/server.js`) that:
  - Manages the MongoDB connection and exposes REST endpoints for users and roles.
  - Serves the built React client in production.
- **Frontend**: React + Vite + Tailwind UI in `client/`:
  - Vite dev server on port `5173` with a proxy to the API.
  - Uses a connection panel and dashboard views for users and roles.

## Getting Started

### Prerequisites

- Node.js (LTS recommended) and npm or Yarn.
- A MongoDB deployment (local or Atlas) **or** willingness to use demo mode.

### Installation

From the project root:

```bash
npm install
```

### Development

Run the backend and frontend together:

```bash
npm run dev
```

This will:

- Start the Express API on `http://localhost:3001`.
- Start the Vite dev server for the React client on `http://localhost:5173`, with a proxy configured for:
  - `/api`
  - `/connect`
  - `/disconnect`
  - `/validate-uri`
  - `/users`
  - `/roles`

Open the dashboard in your browser at:

- `http://localhost:5173`

### Production build

Build and run the compiled server and client:

```bash
npm run build
npm start
```

This will:

- Compile the TypeScript backend into `dist/server.js`.
- Build the React client into `client/dist`.
- Serve the static client from the Express server, listening on `PORT` (default `3001`).

Open the dashboard at:

- `http://localhost:3001`

## Configuration

The server reads the following environment variables:

- `MONGODB_URI` (optional):
  - If provided, surfaced in `/api/config` and used as the default URI in the connection panel.
  - You can still override it from the UI.
- `PORT` (optional, default `3001`):
  - Port on which the Express server listens.
- `ADMIN_USERNAME` (optional, default `admin`):
  - HTTP Basic auth username for protecting the dashboard.
- `ADMIN_PASSWORD` (optional):
  - When set, enables HTTP Basic auth for the dashboard using `ADMIN_USERNAME` / `ADMIN_PASSWORD`.
  - When unset, admin authentication is disabled and the dashboard is open.

> **Security note:** Never commit real production URIs or credentials. Use environment variables or a secrets manager.

## Usage

### Connecting to MongoDB

1. Start the app in dev or production.
2. Open the dashboard in your browser.
3. In the **Cluster connection** panel:
   - Paste a MongoDB URI, or
   - Type `demo` to enable demo mode.

Examples:

- Local deployment:

  ```bash
  mongodb://localhost:27017/admin
  ```

- Local with credentials:

  ```bash
  mongodb://username:password@localhost:27017/?authSource=admin
  ```

- MongoDB Atlas:

  ```bash
  mongodb+srv://user:password@cluster.mongodb.net/?retryWrites=true&w=majority
  ```

The server validates and normalizes the URI and, for real clusters, connects to the `admin` database for user management.

### Demo mode

- If the URI contains `demo` or `test-demo`, the server enables **demo mode** instead of connecting to a real MongoDB instance.
- Demo mode:
  - Uses in-memory sample users and roles.
  - Allows you to explore most flows without touching a real database.

### Managing users

From the **Users** section of the dashboard you can:

- **List users** with metadata and temporary-user flags.
- **Create users**:
  - Provide a username, password, and roles.
  - Passwords are restricted to letters and digits only.
  - Single-select built-in roles (such as `clusterAdmin`, `readWriteAnyDatabase`, `readAnyDatabase`) are enforced so a user cannot hold more than one of them.
- **Create temporary users**:
  - Same as create, but with an `expires in hours` field.
  - Temporary users are cleaned up automatically by the server.
- **Update users**:
  - Change password and/or roles.
- **Delete users**:
  - The server prevents deleting:
    - The last remaining user.
    - Users with critical administrative roles such as `root`, `userAdminAnyDatabase`, `dbAdminAnyDatabase`, or `clusterAdmin`.

You can also fetch effective privileges for a specific user to understand what they can do in the cluster.

### Temporary users & TTL on `system.users`

Temporary users are created with additional metadata on the MongoDB user document:

- `customData.isTemporary: true`
- `customData.tempExpiresAt: <Date>` – the absolute expiry timestamp

If you want MongoDB itself to delete temporary users automatically, you can create a TTL index on the `system.users` collection in the `admin` database:

```js
use admin
db.system.users.createIndex(
  { "customData.tempExpiresAt": 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: { "customData.tempExpiresAt": { $exists: true } }
  }
)
```

- Only users with `customData.tempExpiresAt` set will be subject to this TTL.
- The TTL monitor runs roughly once per minute, so deletion happens shortly after the expiry time, not exactly at it.

The separate `admin.tempUsers` collection is used for auditing/history of temporary accounts and can keep records even after the backing MongoDB user has been removed.

### Managing roles

From the **Roles** section of the dashboard you can:

- Inspect **built-in roles** and their groupings.
- Use the **actions tree** as a guided way to select privileges when defining custom roles.
- Create, update, and delete **custom roles** stored in your MongoDB deployment.

## API Endpoints (summary)

Key endpoints exposed by the backend:

- `GET /api/health` – Basic health/status and connection state.
- `GET /api/config` – Current server config flags and derived values (e.g., `demoMode`, `mongoUriFromEnv`).
- `POST /validate-uri` – Validate and normalize a MongoDB URI without connecting.
- `POST /connect` – Connect to MongoDB (or enter demo mode based on the URI).
- `POST /disconnect` – Disconnect from MongoDB or exit demo mode.
- `GET /api/users` – List users with temporary-user metadata.
- `POST /users` – Create a new user.
- `POST /users/temporary` – Create a temporary user with an expiry time.
- `PUT /users/update` – Update an existing user (password and/or roles).
- `DELETE /users/delete` – Delete a user with safeguards for admin and last-user protection.
- `GET /users/:name/effective-privileges` – Return effective privileges for a specific user.
- `GET /roles/actions-tree` – Return the actions tree used to build custom roles.
- `GET /roles/builtin` – List built-in roles.
- `GET /roles/builtin/grouped` – List built-in roles grouped by category.
- `GET /roles/custom` – List custom roles.
- `POST /roles/custom` – Create a custom role.
- `PUT /roles/custom/:roleName` – Update a custom role.
- `DELETE /roles/custom/:roleName` – Delete a custom role.

For details on backfilling temporary user metadata into existing MongoDB users,
see `docs/temporary-users-migration.md`.

## Development notes

- Backend code lives at the project root (e.g. `server.ts`, `lib/`).
- Frontend code lives in `client/` with:
  - `client/src/components/` – UI components for connection, users, roles, etc.
  - `client/src/hooks/` – Data fetching hooks for dashboard data.
- TypeScript compilation for the backend is configured via `tsconfig.backend.json`.

For client-only tasks (linting, previewing the built UI, etc.), you can also run:

```bash
cd client
npm install
npm run dev        # client only
npm run build      # build client only
npm run preview    # preview built client
```

## License

This project is licensed under the **GNU Lesser General Public License v3.0 or later (LGPL-3.0-or-later)**.  
See the [LICENSE](LICENSE) file for the full license text.
