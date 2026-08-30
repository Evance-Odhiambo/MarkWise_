# Commit Deployment Fixes

Run these commands to commit and push the deployment fixes:

```bash
cd c:\MarkWise1

# Stage all fixes
git add apps/backend/src/plugins/multi-tenancy.ts
git add apps/backend/src/modules/lecturer/lecturer.route.ts
git add apps/backend/src/modules/attendance/in-person/inPerson.route.ts
git add apps/backend/src/modules/attendance/in-person/inPerson.service.ts
git add apps/backend/src/modules/student/student.route.ts
git add apps/backend/src/modules/admin/bootstrap.route.ts
git add apps/backend/src/modules/admin/index.ts

# Add documentation
git add DEPLOYMENT_FIXES.md
git add commit-deployment-fixes.md

# Commit with detailed message
git commit -m "fix: resolve Cloud Run deployment TypeScript errors

Fixed compilation errors preventing Cloud Run deployment:

1. Multi-tenancy middleware: Disabled Prisma.$use() (not supported)
   - Added TODO for future Prisma Client Extensions implementation
   - Manual tenant filtering still works in all routes

2. Lecturer queries: Updated for compound unique constraint
   - Changed from { staffNumber } to { institutionId_staffNumber: {...} }
   - Ensures multi-tenancy at database level

3. ConductedSession queries: Use direct institutionId field
   - Changed from nested lecturer relation to direct field
   - Improves query performance and correctness

4. Student import: Add institutionId validation
   - Prevents undefined institutionId in queries
   - Better error messages for missing data

5. Bootstrap route: Add super admin creation endpoint
   - Enables easy super admin setup on Cloud Run
   - Can be disabled after initial bootstrap

All TypeScript errors resolved. Build passes locally.
"

# Push to trigger Cloud Run redeployment
git push origin master

# Monitor deployment
echo "Deployment triggered. Monitor at:"
echo "https://console.cloud.google.com/run/detail/europe-west1/backend-api"
```

---

## Quick One-Liner

If you want to commit everything at once:

```bash
cd c:\MarkWise1
git add .
git commit -m "fix: resolve Cloud Run deployment errors and add bootstrap endpoint"
git push origin master
```

---

## After Successful Deployment

Bootstrap super admin:

```bash
# Check if already exists
curl https://backend-api-26ojx3spiq-ew.a.run.app/api/v1/admin/bootstrap/status

# Create super admin (if doesn't exist)
curl -X POST https://backend-api-26ojx3spiq-ew.a.run.app/api/v1/admin/bootstrap/super-admin

# Test login
curl -X POST https://backend-api-26ojx3spiq-ew.a.run.app/api/v1/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@markwise.local","password":"Evance@2005..."}'
```
