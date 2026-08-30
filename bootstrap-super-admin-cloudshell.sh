#!/bin/bash
# Bootstrap Super Admin on Cloud Shell
# Run this script in Google Cloud Shell

echo "=== MarkWise Super Admin Bootstrap ==="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -d "apps/backend" ]; then
  echo -e "${YELLOW}Not in MarkWise1 root directory. Navigating...${NC}"
  cd ~/MarkWise1 || {
    echo -e "${RED}Error: MarkWise1 directory not found!${NC}"
    echo "Please clone the repository first:"
    echo "  git clone https://github.com/yourusername/MarkWise1.git"
    exit 1
  }
fi

cd apps/backend

echo -e "${YELLOW}1. Installing dependencies...${NC}"
npm install

echo ""
echo -e "${YELLOW}2. Building TypeScript...${NC}"
npm run build

echo ""
echo -e "${YELLOW}3. Setting environment variables...${NC}"
export DATABASE_URL="postgresql://neondb_owner:npg_flPbyxqLc1Q3@ep-curly-wind-ax8r8qp5-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
export SUPER_ADMIN_NAME="MarkWise Super Admin"
export SUPER_ADMIN_EMAIL="superadmin@markwise.local"
export SUPER_ADMIN_PASSWORD="Evance@2005..."

echo "DATABASE_URL: Set ✓"
echo "SUPER_ADMIN_NAME: $SUPER_ADMIN_NAME"
echo "SUPER_ADMIN_EMAIL: $SUPER_ADMIN_EMAIL"

echo ""
echo -e "${YELLOW}4. Running bootstrap script...${NC}"
node dist/scripts/bootstrap-super-admin.js

if [ $? -eq 0 ]; then
  echo ""
  echo -e "${GREEN}✅ Success! Super admin created!${NC}"
  echo ""
  echo "Login credentials:"
  echo "  Email: superadmin@markwise.local"
  echo "  Password: Evance@2005..."
  echo ""
  echo "You can now log in at:"
  echo "  http://localhost:3000/admin/super-admin/login"
  echo "  (or your deployed web app URL)"
  echo ""
  echo -e "${YELLOW}⚠️  Remember to change the password after first login!${NC}"
else
  echo ""
  echo -e "${RED}❌ Error: Bootstrap failed!${NC}"
  echo ""
  echo "Possible reasons:"
  echo "  1. Super admin already exists"
  echo "  2. Database connection failed"
  echo "  3. Build errors"
  echo ""
  echo "Check the error message above for details."
  exit 1
fi
