# Deploying the backend from the repository

Configure the Cloud Run repository deployment with:

- Source directory: `apps/backend`
- Dockerfile: `Dockerfile`
- Container port: `4000`
- Public access: enabled, because the mobile and web clients call the API directly
- Runtime secrets: configure through Secret Manager, never through the repository `.env`

The Dockerfile generates Prisma Client with a build-only placeholder URL. The real
`DATABASE_URL` is only required when the container starts.

Apply migrations separately before sending traffic to a new revision:

```powershell
cd apps/backend
npx prisma migrate deploy
```

Required runtime configuration:

```text
DATABASE_URL
DATABASE_POOL_MAX
JWT_SECRET
CORS_ORIGIN
WEBAUTHN_RP_ID
WEBAUTHN_ORIGIN
RATE_LIMIT_MAX
RATE_LIMIT_WINDOW
SUPER_ADMIN_NAME
SUPER_ADMIN_EMAIL
SUPER_ADMIN_PASSWORD
```

Cloud Run supplies `PORT`; the application already listens on `0.0.0.0` and uses
that injected value.
