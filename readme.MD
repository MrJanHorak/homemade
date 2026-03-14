# Homemade

Homemade is a maker-focused social app built on MongoDB and Express. The project now has a staged front-end migration in place:

- Express remains the backend for MongoDB access, Google auth, sessions, uploads, and Socket.IO chat.
- Next.js now provides the modern UI layer for the migrated browse flows.
- EJS still exists for legacy routes that have not been moved yet.

## Current architecture

- `server.js`, `routes/`, `controllers/`, `models/`: existing Express application
- `routes/api.js`, `controllers/api.js`, `lib/serializers.js`: JSON API for the new frontend
- `frontend/`: Next.js App Router frontend

## Migrated routes

The following routes are now implemented in Next.js and consume the Express API:

- `/`
- `/projects`
- `/projects/:id`
- `/profiles`
- `/profiles/:id`
- `/search?query=...`

The following features still use Express/EJS for now:

- Google auth entry and callback
- create/edit project forms
- edit profile
- chats UI

## API routes

The Express backend now exposes these endpoints for the frontend:

- `GET /api/health`
- `GET /api/session/current`
- `GET /api/projects`
- `GET /api/projects/:id`
- `POST /api/projects/:id/comments`
- `GET /api/profiles`
- `GET /api/profiles/:id`
- `GET /api/search?query=...`
- `GET /api/chats`
- `GET /api/chats/:chatId`
- `POST /api/chats`

Admin and moderation endpoints:

- `GET /api/categories`
- `GET /api/admin/category-suggestions?status=pending|approved|rejected&promoted=true|false`
- `PUT /api/admin/category-suggestions/:id`
- `POST /api/admin/category-suggestions/:id/promote`
- `POST /api/admin/category-suggestions/:id/demote`

## Admin access

The app now includes an admin moderation page for category suggestions.

### Admin UI access

1. Sign in with Google as usual.
2. Open the account menu in the Next.js header.
3. If your profile role is `admin`, you will see `Category moderation`.
4. You can also visit `/admin/category-suggestions` directly.

### Who is an admin

Admins are determined by the `role` field on the authenticated user's `Profile` document in MongoDB.

- `role: "user"` (default): regular user
- `role: "admin"`: can access admin moderation APIs and UI

## Adding or removing admins

Use MongoDB shell (`mongosh`) or MongoDB Compass.

### Option A: mongosh

Connect using your existing `DATABASE_URL`, then run updates against the `profiles` collection.

Find a profile:

```javascript
db.profiles.find({ name: /jan/i }, { _id: 1, name: 1, role: 1 });
```

Promote to admin:

```javascript
db.profiles.updateOne(
  { _id: ObjectId('PROFILE_ID_HERE') },
  { $set: { role: 'admin' } },
);
```

Revoke admin:

```javascript
db.profiles.updateOne(
  { _id: ObjectId('PROFILE_ID_HERE') },
  { $set: { role: 'user' } },
);
```

### Option B: MongoDB Compass

1. Connect to the database using `DATABASE_URL`.
2. Open the `profiles` collection.
3. Locate the profile document.
4. Edit `role` to `admin` (or back to `user`).
5. Save.

### Verify admin assignment

After changing role:

1. Sign out and sign back in (or refresh session).
2. Call `GET /api/session/current` and confirm `user.profile.role` is `admin`.
3. Open `/admin/category-suggestions` and confirm access.

## Admin safety notes

- Keep the number of admins small.
- Prefer promoting trusted profiles only.
- Review category suggestions regularly and reject unsafe labels.
- Demote admin accounts that no longer need moderation access.

## Environment variables

Copy `.env.example` to `.env` and fill in the values.

Required backend values:

- `DATABASE_URL`
- `SESSION_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_SECRET`
- `GOOGLE_CALLBACK`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `S3_BUCKET`

Recommended for the hybrid setup:

- `FRONTEND_URL=http://localhost:3001`
- `CLIENT_ORIGIN=http://localhost:3001`
- `API_BASE_URL=http://localhost:3000`
- `NEXT_PUBLIC_API_BASE_URL=http://localhost:3000`

## Local development

Install dependencies:

```bash
npm install
```

Run both apps together:

```bash
npm run dev
```

Run only the backend:

```bash
npm run dev:server
```

Run only the frontend:

```bash
npm run dev:client
```

Build the frontend:

```bash
npm run build:client
```

## Migration notes

This is an incremental migration, not a rewrite. The intended sequence is:

1. Keep Express as the source of truth for data, auth, uploads, and sockets.
2. Move each EJS page to Next.js.
3. Replace form posts and legacy redirects with JSON mutations.
4. Move chat UI to Next.js while keeping Socket.IO on Express.
5. Remove EJS once the migrated surface is complete.

## Asset credits

<a href="https://www.flaticon.com/free-icons/roles" title="roles icons">Roles icons created by Soremba - Flaticon</a>
<a href="https://www.flaticon.com/free-icons/roles" title="roles icons">Roles icons created by Soremba - Flaticon</a>
<a href="https://www.flaticon.com/free-icons/diy" title="DIY icons">DIY icons created by noomtah - Flaticon</a>
<a href="https://www.flaticon.com/free-icons/comment" title="comment icons">Comment icons created by Smashicons - Flaticon</a>
<a href="https://www.flaticon.com/free-icons/logout" title="logout icons">Logout icons created by Pixel perfect - Flaticon</a>
