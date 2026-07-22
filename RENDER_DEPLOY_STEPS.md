# ApnaServo Admin Render Deployment

Deploy this folder as the browser admin panel:

`C:\Users\Admin\Documents\New project\apnaservo-admin`

The admin panel does not use mock/default data in production. It reads live users, bookings, partners, complaints, tickets, payments, and realtime events from the ApnaServo backend configured in `APNASERVO_BACKEND_URL`.

## 1. Deploy or verify the backend first

Backend must already be live on Render with MongoDB Atlas and Firebase Admin configured.

Verify:

```text
https://YOUR-BACKEND-SERVICE.onrender.com/health
https://YOUR-BACKEND-SERVICE.onrender.com/ready
```

Expected:

```json
{"ok":true}
```

`/ready` must show MongoDB connected. If it returns `503`, fix backend `MONGODB_URI` or Atlas Network Access before deploying admin.

## 2. Create the admin Render service

In Render:

- New `Web Service`
- Runtime: `Node`
- Root Directory: `apnaservo-admin` if deploying from the workspace/root repo, otherwise leave empty if this folder is its own repo
- Build Command: `npm ci --include=dev && npm run build`
- Start Command: `npm start -- -H 0.0.0.0`
- Health Check Path: `/dashboard`
- Auto Deploy: enabled

This folder also includes `render.yaml` if you prefer a Render Blueprint import.

## 3. Set admin environment variables

Required now:

```text
NODE_ENV=production
ADMIN_AUTH_DISABLED=true
NEXT_PUBLIC_ENABLE_DEMO_DATA=false
APP_BASE_URL=https://YOUR-ADMIN-SERVICE.onrender.com
APNASERVO_BACKEND_URL=https://YOUR-BACKEND-SERVICE.onrender.com
NEXT_PUBLIC_APNASERVO_BACKEND_URL=https://YOUR-BACKEND-SERVICE.onrender.com
ADMIN_BACKEND_SECRET=SAME_VALUE_AS_BACKEND_ADMIN_API_SECRET
ADMIN_EMAIL=admin@apnaservo.com
```

Do not set demo data to true. `ADMIN_BACKEND_SECRET` must exactly match the backend Render variable `ADMIN_API_SECRET`, otherwise realtime/admin APIs will fail.

Optional for later password login:

```text
ADMIN_AUTH_DISABLED=false
JWT_SECRET=32-plus-character-random-secret
ADMIN_PASSWORD_HASH=bcrypt-hash
DATABASE_URL=postgresql://...
```

Generate later password values only when login is being enabled:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
node -e "require('bcryptjs').hash('YOUR_LONG_PASSWORD', 12).then(console.log)"
```

## 4. Update backend CORS after admin URL is live

Set backend Render env:

```text
CLIENT_ORIGIN=https://YOUR-ADMIN-SERVICE.onrender.com
```

If you also have a website origin, comma-separate it:

```text
CLIENT_ORIGIN=https://YOUR-ADMIN-SERVICE.onrender.com,https://YOUR-WEBSITE-DOMAIN
```

Redeploy the backend after changing `CLIENT_ORIGIN`.

## 5. Verify admin

Open:

```text
https://YOUR-ADMIN-SERVICE.onrender.com/dashboard
https://YOUR-ADMIN-SERVICE.onrender.com/api/admin/overview
```

The top live status should show `Live backend`. When a user books, a partner accepts, a payment quote is sent, or a complaint/ticket is created, the admin panel should receive the realtime event and refresh the relevant tables.
