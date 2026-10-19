# GREETOS

GREETOS vegetable storefront. Current deployment hostnames are listed below.

| Folder | What | Live at |
|---|---|---|
| `frontend/` | Next.js storefront | oldspice.pcgnp.co |
| `admin/` | Vite admin panel | admin.oldspice.pcgnp.co |
| `api/` | Express + Prisma API | api.oldspice.pcgnp.co |
| `products/` | Original product photos | (source for `api/uploads/products`) |

## Deploying

**Push to `main` = deploy.** The Deploy Panel (deploy.pcgnp.co, project
`oldspice`) pulls the repo, builds the API, admin and storefront, and restarts
them on vps95.

- Settings (database URL, JWT secret, Razorpay keys, API address) live in
  the panel's env for each app, **not in git**. Change them there, then
  redeploy.
- The panel runs services with `NODE_ENV=production`. `ALLOW_DEV_OTP=true` in
  the API env keeps the demo login code working. Turn it off and configure
  SMTP/SMS before real customers use the site.
- Uploaded files are kept in `/opt/oldspice-uploads` on the server
  (`UPLOADS_DIR`), because every deploy git-cleans the repo.

## Database

The API uses the separate `greetospune` Supabase project in Mumbai
(`vcyhbnidoqrhwvwwogee`). Its connection URLs are kept in the ignored
`api/.env`; both point directly to that project's database. The schema is
managed with `prisma db push`, not `prisma migrate deploy`. Switching projects
does not copy records; the new database starts with its own independent data.

**Never point this app at `rzpjeynwqauwxbwukpge`.** That is Poshanful's live
database. `npm run seed` refuses it, and it deletes every product not in
`api/prisma/seed-data/products.json`, so back up the database before any seed.

## Local development

```bash
cd api && npm install && npm run dev          # :5002, uses api/.env
cd frontend && npm install && npm run dev     # :3000, uses frontend/.env.local
cd admin && npm install && npx vite --port=3001
```

Copy each `.env.example` to `.env` (or `.env.local` for the frontend) and fill
in the values.
