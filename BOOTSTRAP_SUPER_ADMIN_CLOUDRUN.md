# Bootstrap Super Admin on Cloud Run

## Current Super Admin Credentials (from .env)
- **Email:** `superadmin@markwise.local`
- **Password:** `Evance@2005...`
- **Name:** `MarkWise Super Admin`

## Option 1: Run via Cloud Run Jobs (Recommended) ⭐

Cloud Run Jobs allow you to run one-off tasks without keeping a service running.

### Step 1: Create a Job Script
Already exists at: `apps/backend/src/scripts/bootstrap-super-admin.ts`

### Step 2: Deploy as Cloud Run Job

```bash
# From your Cloud Shell or local terminal with gcloud
cd ~/MarkWise1/apps/backend

# Deploy as a job
gcloud run jobs create bootstrap-super-admin \
  --source . \
  --region europe-west1 \
  --set-env-vars DATABASE_URL="postgresql://neondb_owner:npg_flPbyxqLc1Q3@ep-curly-wind-ax8r8qp5-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require",SUPER_ADMIN_NAME="MarkWise Super Admin",SUPER_ADMIN_EMAIL="superadmin@markwise.local",SUPER_ADMIN_PASSWORD="Evance@2005..." \
  --command="node" \
  --args="dist/scripts/bootstrap-super-admin.js"
```

### Step 3: Execute the Job

```bash
gcloud run jobs execute bootstrap-super-admin \
  --region europe-west1 \
  --wait
```

### Step 4: View Logs

```bash
gcloud run jobs executions logs read \
  --region europe-west1 \
  --job bootstrap-super-admin
```

---

## Option 2: Run via Cloud Shell with Direct Database Connection 🚀

This is the **quickest method** - run the script directly from Cloud Shell.

### Step 1: Connect to Cloud Shell

Go to: https://console.cloud.google.com/ and click the Cloud Shell icon (top right).

### Step 2: Clone Your Repo (if not already)

```bash
# Clone your repository
git clone https://github.com/yourusername/MarkWise1.git
cd MarkWise1/apps/backend

# Or if already cloned, just navigate
cd ~/MarkWise1/apps/backend
```

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Set Environment Variables

```bash
# Set environment variables
export DATABASE_URL="postgresql://neondb_owner:npg_flPbyxqLc1Q3@ep-curly-wind-ax8r8qp5-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
export SUPER_ADMIN_NAME="MarkWise Super Admin"
export SUPER_ADMIN_EMAIL="superadmin@markwise.local"
export SUPER_ADMIN_PASSWORD="Evance@2005..."
```

### Step 5: Build and Run the Script

```bash
# Build TypeScript
npm run build

# Run the bootstrap script
node dist/scripts/bootstrap-super-admin.js
```

**Expected Output:**
```
Created SUPER_ADMIN: superadmin@markwise.local (uuid-here)
```

---

## Option 3: Add an API Endpoint to Bootstrap Super Admin

Create a secure endpoint that can be called once to bootstrap the super admin.

### Step 1: Create Bootstrap Route

Create `apps/backend/src/modules/admin/bootstrap.route.ts`:

```typescript
import type { FastifyPluginAsync } from "fastify";
import { hashPassword } from "./admin.service.js";

export const bootstrapRoutes: FastifyPluginAsync = async (app) => {
  app.post("/bootstrap/super-admin", async (request, reply) => {
    // Only allow if no super admin exists
    const existing = await app.prisma.admin.findFirst({
      where: { role: "SUPER_ADMIN" },
    });

    if (existing) {
      return reply.code(409).send({
        error: "Super admin already exists",
        email: existing.email,
      });
    }

    const { fullName, email, password } = request.body as {
      fullName: string;
      email: string;
      password: string;
    };

    if (!fullName || !email || !password) {
      return reply.code(400).send({
        error: "fullName, email, and password are required",
      });
    }

    if (password.length < 12) {
      return reply.code(400).send({
        error: "Password must be at least 12 characters",
      });
    }

    const admin = await app.prisma.admin.create({
      data: {
        fullName,
        email: email.toLowerCase(),
        passwordHash: await hashPassword(password),
        role: "SUPER_ADMIN",
      },
      select: { id: true, email: true, role: true },
    });

    return reply.send({
      success: true,
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
      },
    });
  });
};
```

### Step 2: Register the Route

Add to your main app (e.g., `apps/backend/src/app.ts`):

```typescript
import { bootstrapRoutes } from "./modules/admin/bootstrap.route.js";

// Register route
await app.register(bootstrapRoutes, { prefix: "/api/v1/admin" });
```

### Step 3: Call the Endpoint

```bash
curl -X POST https://backend-api-26ojx3spiq-ew.a.run.app/api/v1/admin/bootstrap/super-admin \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "MarkWise Super Admin",
    "email": "superadmin@markwise.local",
    "password": "Evance@2005..."
  }'
```

**⚠️ Security Note:** After bootstrapping, you should disable or remove this endpoint!

---

## Option 4: Run via Cloud Run Service Console

### Step 1: Access Cloud Run Console

1. Go to: https://console.cloud.google.com/run
2. Click on your `backend-api` service
3. Click **"REVISIONS"** tab
4. Click on the current revision

### Step 2: Open Cloud Shell from Console

Click the **Cloud Shell** icon in the top right

### Step 3: Execute Command on Running Instance

```bash
# Get the service URL
SERVICE_URL="https://backend-api-26ojx3spiq-ew.a.run.app"

# Use gcloud to run a command (requires service account permissions)
gcloud run services update backend-api \
  --region europe-west1 \
  --command "node" \
  --args "dist/scripts/bootstrap-super-admin.js" \
  --no-traffic
```

---

## Option 5: Use Prisma Studio with Seed

### Step 1: Create a Seed File

Create `apps/backend/prisma/seed.ts`:

```typescript
import { PrismaClient } from "../src/generated/prisma/client.js";
import { hashPassword } from "../src/modules/admin/admin.service.js";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.admin.findFirst({
    where: { role: "SUPER_ADMIN" },
  });

  if (existing) {
    console.log("Super admin already exists:", existing.email);
    return;
  }

  const admin = await prisma.admin.create({
    data: {
      fullName: "MarkWise Super Admin",
      email: "superadmin@markwise.local",
      passwordHash: await hashPassword("Evance@2005..."),
      role: "SUPER_ADMIN",
    },
  });

  console.log("Created super admin:", admin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### Step 2: Add Seed Script to package.json

```json
{
  "scripts": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

### Step 3: Run Seed

```bash
cd apps/backend
npm run seed
```

---

## Recommended Approach: Option 2 (Cloud Shell) 🎯

This is the **fastest and easiest** method:

```bash
# Quick Copy-Paste Commands
cd ~/MarkWise1/apps/backend
npm install
npm run build

export DATABASE_URL="postgresql://neondb_owner:npg_flPbyxqLc1Q3@ep-curly-wind-ax8r8qp5-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
export SUPER_ADMIN_NAME="MarkWise Super Admin"
export SUPER_ADMIN_EMAIL="superadmin@markwise.local"
export SUPER_ADMIN_PASSWORD="Evance@2005..."

node dist/scripts/bootstrap-super-admin.js
```

---

## After Bootstrapping

### Test Login

```bash
curl -X POST https://backend-api-26ojx3spiq-ew.a.run.app/api/v1/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superadmin@markwise.local",
    "password": "Evance@2005..."
  }'
```

**Expected Response:**
```json
{
  "id": "uuid",
  "name": "MarkWise Super Admin",
  "email": "superadmin@markwise.local",
  "role": "SUPER_ADMIN",
  "token": "jwt-token-here"
}
```

### Login via Web App

1. Go to: `http://localhost:3000/admin/super-admin/login` (or your deployed web app URL)
2. Enter:
   - **Email:** `superadmin@markwise.local`
   - **Password:** `Evance@2005...`
3. Click **Login**

---

## Troubleshooting

### Error: "A super admin already exists"

**Solution:** Super admin is already created! Try logging in.

### Error: "DATABASE_URL is required"

**Solution:** Make sure environment variable is set:
```bash
echo $DATABASE_URL
# Should show your database URL
```

### Error: "Cannot find module"

**Solution:** Build the project first:
```bash
npm run build
```

### Error: "Connection timeout"

**Solution:** Check database URL and network connectivity:
```bash
# Test database connection
psql "postgresql://neondb_owner:npg_flPbyxqLc1Q3@ep-curly-wind-ax8r8qp5-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

---

## Security Best Practices

1. **Change the default password** immediately after first login
2. **Remove or disable** the bootstrap endpoint after use
3. **Use strong passwords** (at least 12 characters)
4. **Enable 2FA** if available
5. **Rotate credentials** regularly

---

## Quick Reference

| Method | Speed | Complexity | Use Case |
|--------|-------|------------|----------|
| Cloud Shell | ⚡ Fast | ⭐ Easy | Quick setup |
| Cloud Run Job | 🚀 Medium | ⭐⭐ Medium | Production |
| API Endpoint | ⚡ Fast | ⭐⭐⭐ Complex | One-time setup |
| Prisma Seed | 🚀 Medium | ⭐ Easy | Development |

**Recommended:** Use **Cloud Shell** for quick setup!
