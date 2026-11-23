# HomeMade DIY Social Site

HomeMade is a community for finding DIY builds and sharing the steps, materials, tools, and photos behind a project. Read [PLAN.md](PLAN.md) for the current audit and priorities before changing a reviewed flow.

## Repository map

| Area | Location |
| --- | --- |
| Next.js App Router and shared UI | `frontend/app/`, `frontend/components/`, `frontend/lib/` |
| Express JSON endpoints and serialization | `routes/api.js`, `controllers/api.js`, `lib/serializers.js` |
| Express startup, sessions, and sign-in | `server.js`, `bin/www.js`, `routes/auth.js`, `config/passport.js`, `middleware/` |
| MongoDB models and S3 uploads | `models/`, `config/database.js`, `services/s3Service.js` |
| Legacy page redirects and archived EJS code | `routes/frontend.js`, `routes/`, `controllers/`, `views/`, `public/` |

## Local development

- Install from the repository root with `npm ci`. The frontend is an npm workspace in the same lockfile.
- `npm run dev` starts Express on port 3000 and Next.js on port 3001 by default. Use `npm run dev:server` or `npm run dev:client` to run one side.
- `npm run build:client` checks the production frontend build. The layout uses local font stacks.
- `npm test` runs offline regressions for the security boundaries and project rendering helpers. Use a disposable database for integration checks that require MongoDB.
- Use a disposable MongoDB database and test credentials or fixtures for local checks. Keep secrets, session data, auth links, uploaded buffers, and private messages out of commits and logs.
- Check `.env.example` and the README when configuring local services. Browser API requests use `NEXT_PUBLIC_API_BASE_URL`. For viewer-aware server rendering, the Express session cookie must also reach Next.js. The local ports share a host, and production can use a same-host reverse proxy.

## Changes across the stack

- Use Next.js for user-facing work and Express for server-side authorization, validation, and persistence. Keep the old page URLs as redirects. Next.js chat uses the JSON API.
- Enforce viewer and actor permissions at the server boundary. Cover project visibility and ownership, profile self-edit and admin roles, and chat membership and message ownership. Allowlist writable fields and derive actor identity from the session.
- Keep content sanitization compatible with server rendering and browser hydration. Treat uploaded files, rich text, and external links as untrusted input.
- Preserve compatibility with existing MongoDB records when changing project steps, image references, ratings, or categories. Keep migration work reversible and validate it on representative old and new records.
- Preserve deep links and in-progress work where practical. Review the relevant empty, loading, error, access-denied, and success states. Check responsive layout, labels, and keyboard focus on UI changes.
- Cover new security boundaries with focused regression tests. For other changes, run the closest available checks and note service or environment limits in the handoff.
