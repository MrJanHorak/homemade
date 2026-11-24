# Homemade

Homemade is a maker-focused social app. Next.js serves the user interface, and Express handles MongoDB access, authentication, sessions, uploads, and the JSON API.

## Current architecture

- `server.js`, `routes/`, `controllers/`, `models/`: existing Express application
- `routes/api.js`, `controllers/api.js`, `lib/serializers.js`: JSON API for the new frontend
- `frontend/`: Next.js App Router frontend

## Browser routes

Open the Next.js frontend for browsing, project editing, profiles, chats, and moderation. Old Express page links redirect to the frontend. Chat uses the participant-checked JSON API. OAuth entry and callback routes remain on Express.

## API routes

The Express backend now exposes these endpoints for the frontend:

- `GET /api/health`
- `GET /api/session/current`
- `GET /api/projects`
- `GET /api/projects/:id`
- `DELETE /api/projects/:id` for the owner
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

Set `DATABASE_URL` for a disposable local MongoDB database and set `SESSION_SECRET`. Configure `GOOGLE_CLIENT_ID`, `GOOGLE_SECRET`, and `GOOGLE_CALLBACK` to test Google sign-in. Apple sign-in is disabled while its callback validation is being replaced. Existing password accounts can still sign in. Email sign-up, verification resend, and magic-link requests require a mail delivery implementation for production. To test those flows locally with a disposable database and a loopback-only service, set `AUTH_DEBUG_LINKS=true` to return development links directly.

Email authentication POST endpoints share a limit of 30 requests per IP per 15 minutes, per server process. A 429 response includes `Retry-After`. This in-memory limit resets on restart and is not shared between instances; production deployments need a shared rate limiter or equivalent edge protection. Configure trusted proxy hops accurately so the client IP is interpreted correctly.

For uploads, set `S3_BUCKET` and `AWS_REGION` and use the AWS SDK credential chain. Use a test bucket. The app currently stores direct S3 image URLs, so hiding a project in HomeMade does not revoke those URLs.

Project and avatar uploads accept JPEG or PNG files up to 5 MB each, 10,000 pixels per side, and 40 megapixels. Dimensions are checked from image headers; complete decoding and validation are still needed before treating uploaded content as fully verified.

The upload service attempts to delete every object from a failed upload batch before a database write starts. Its S3 credentials need `s3:DeleteObject` as well as `s3:PutObject` for those app-owned keys. Cleanup is best effort; failed cleanup and ambiguous database-write outcomes still require storage reconciliation.

Use these origins for local development.

- `FRONTEND_URL=http://localhost:3001`
- `CLIENT_ORIGIN=http://localhost:3001`
- `API_BASE_URL=http://localhost:3000`
- `NEXT_PUBLIC_API_BASE_URL=http://localhost:3000`

Next.js reads `NEXT_PUBLIC_API_BASE_URL` from its frontend process environment. If you change it from the local default, set it in `frontend/.env.local` or export it before starting or building Next.js. Set `FRONTEND_URL` explicitly in production. A same-host reverse proxy can route `/api`, the Express auth endpoints, and public assets to Express while serving UI routes from Next.js. Next.js must receive the session cookie for owner-only pages it renders on the server. Use HTTPS in production and configure `TRUST_PROXY_HOPS` to match a known proxy chain.

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

Build the frontend and run offline regression tests.

```bash
npm run build:client
npm test
```

See [PLAN.md](PLAN.md) for the remaining deployment, dependency, and UX work.

## Asset credits

<a href="https://www.flaticon.com/free-icons/roles" title="roles icons">Roles icons created by Soremba - Flaticon</a>
<a href="https://www.flaticon.com/free-icons/roles" title="roles icons">Roles icons created by Soremba - Flaticon</a>
<a href="https://www.flaticon.com/free-icons/diy" title="DIY icons">DIY icons created by noomtah - Flaticon</a>
<a href="https://www.flaticon.com/free-icons/comment" title="comment icons">Comment icons created by Smashicons - Flaticon</a>
<a href="https://www.flaticon.com/free-icons/logout" title="logout icons">Logout icons created by Pixel perfect - Flaticon</a>
