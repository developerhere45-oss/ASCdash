# ApnaServo Admin Panel

Production-ready browser admin dashboard for ApnaServo, built for `admin.apnaservo.com`.

## Stack

- Next.js 15 App Router
- TypeScript
- Tailwind CSS
- Prisma ORM with PostgreSQL schema
- JWT cookie authentication
- TanStack Query
- Zustand
- Recharts
- Framer Motion
- Role-based access structure

## Run Locally

```bash
npm install
npm run prisma:generate
npm run dev -- --hostname 127.0.0.1 --port 3100
```

Open:

```text
http://127.0.0.1:3100
```

Local development can use temporary credentials from `.env.local`:

```text
ADMIN_EMAIL=admin@apnaservo.com
ADMIN_PASSWORD=replace-this-local-only-password
```

Before production, copy `.env.example` to `.env.local` and set `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `DATABASE_URL`, `APNASERVO_BACKEND_URL`, and `ADMIN_BACKEND_SECRET`.

Generate a bcrypt admin password hash:

```bash
node -e "require('bcryptjs').hash('YOUR_LONG_PASSWORD', 12).then(console.log)"
```

For live app data, point the admin panel to the deployed ApnaServo backend:

```env
APNASERVO_BACKEND_URL="https://apnaservobk-1.onrender.com"
ADMIN_BACKEND_SECRET="same-value-as-backend-ADMIN_API_SECRET"
```

Set the same value as `ADMIN_API_SECRET` in the backend Render environment. The admin panel uses this for secure REST admin APIs and the Socket.IO realtime admin room. Production builds intentionally fail closed if this secret or the live backend URL is missing.

## Main Modules

- Dashboard overview
- Users
- Service partners
- Bookings
- Quotes
- Services
- Complaints and disputes
- Notifications
- Banners
- Analytics
- Audit logs
- Settings

## API Routes

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/admin/overview`
- `GET /api/admin/:resource`
- `POST /api/admin/actions`

These routes proxy live data from the main backend first and fall back to local demo data if the backend is unreachable.

## Database

The Prisma schema is in `prisma/schema.prisma` and includes:

- Admins
- Users
- Technicians
- Bookings
- Quotes
- Services
- Complaints
- Notifications
- Banners
- Audit logs

Run migrations after configuring PostgreSQL:

```bash
npm run prisma:migrate
```
