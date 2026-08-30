# Quick Bootstrap Super Admin Guide

## 🚀 Fastest Method: Using API Endpoint

I've added a bootstrap API endpoint to your backend. After deploying the updated backend, you can bootstrap the super admin with one simple command:

### Step 1: Deploy Updated Backend

First, commit and push the new bootstrap route:

```bash
cd c:\MarkWise1
git add apps/backend/src/modules/admin/bootstrap.route.ts
git add apps/backend/src/modules/admin/index.ts
git commit -m "feat: add bootstrap endpoint for super admin creation"
git push origin master
```

Then redeploy to Cloud Run (or it will auto-deploy if you have CI/CD).

### Step 2: Check Status

```bash
curl https://backend-api-26ojx3spiq-ew.a.run.app/api/v1/admin/bootstrap/status
```

### Step 3: Create Super Admin

**Option A: Using environment variables (already set in Cloud Run)**

```bash
curl -X POST https://backend-api-26ojx3spiq-ew.a.run.app/api/v1/admin/bootstrap/super-admin
```

**Option B: Provide credentials in request**

```bash
curl -X POST https://backend-api-26ojx3spiq-ew.a.run.app/api/v1/admin/bootstrap/super-admin \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "MarkWise Super Admin",
    "email": "superadmin@markwise.local",
    "password": "Evance@2005..."
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Super admin created successfully",
  "admin": {
    "id": "uuid-here",
    "fullName": "MarkWise Super Admin",
    "email": "superadmin@markwise.local",
    "role": "SUPER_ADMIN",
    "createdAt": "2024-01-..."
  }
}
```

### Step 4: Login

Now you can log in:

```bash
curl -X POST https://backend-api-26ojx3spiq-ew.a.run.app/api/v1/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superadmin@markwise.local",
    "password": "Evance@2005..."
  }'
```

---

## Alternative: Cloud Shell Method

If you prefer running the script directly:

### Quick Commands (Copy & Paste)

```bash
# In Google Cloud Shell
cd ~/MarkWise1/apps/backend

# Install and build
npm install && npm run build

# Set environment variables
export DATABASE_URL="postgresql://neondb_owner:npg_flPbyxqLc1Q3@ep-curly-wind-ax8r8qp5-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
export SUPER_ADMIN_NAME="MarkWise Super Admin"
export SUPER_ADMIN_EMAIL="superadmin@markwise.local"
export SUPER_ADMIN_PASSWORD="Evance@2005..."

# Run bootstrap
node dist/scripts/bootstrap-super-admin.js
```

---

## Or Use the Automated Script

```bash
# In Cloud Shell, navigate to your project
cd ~/MarkWise1

# Make script executable
chmod +x bootstrap-super-admin-cloudshell.sh

# Run it
./bootstrap-super-admin-cloudshell.sh
```

---

## After Bootstrap

### Test Login API

```bash
curl -X POST https://backend-api-26ojx3spiq-ew.a.run.app/api/v1/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superadmin@markwise.local",
    "password": "Evance@2005..."
  }'
```

### Login via Web App

1. Go to: `/admin/super-admin/login`
2. Enter credentials:
   - **Email:** `superadmin@markwise.local`
   - **Password:** `Evance@2005...`
3. Click Login

---

## Troubleshooting

### "Super admin already exists"
✅ Great! Super admin is already created. Just log in.

### "Email and password are required"
Set them in the request body or environment variables.

### "Connection error"
Check that:
1. Backend is deployed and running
2. Database URL is correct
3. Network connection is stable

### "404 Not Found"
The bootstrap endpoint hasn't been deployed yet. Deploy the updated backend first.

---

## Security Notes

⚠️ **After creating super admin:**
1. Change the default password immediately
2. Consider disabling the bootstrap endpoint in production
3. Never commit passwords to git (they're already in .gitignore)

To disable bootstrap endpoint after use, comment out this line in `apps/backend/src/modules/admin/index.ts`:
```typescript
// await app.register(bootstrapRoutes); // Disabled after bootstrap
```

---

## Summary

**Recommended for Cloud Run:** Use the API endpoint method
1. Deploy updated backend (with bootstrap route)
2. Call: `POST /api/v1/admin/bootstrap/super-admin`
3. Login with credentials
4. Done! 🎉

**Credentials:**
- Email: `superadmin@markwise.local`
- Password: `Evance@2005...`
