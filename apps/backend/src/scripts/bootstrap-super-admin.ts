import dotenv from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { hashPassword } from "../modules/admin/admin.service.js";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

function required(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

const databaseUrl = required("DATABASE_URL");
const fullName = required("SUPER_ADMIN_NAME");
const email = required("SUPER_ADMIN_EMAIL").toLowerCase();
const password = required("SUPER_ADMIN_PASSWORD");

if (password.length < 12) {
  throw new Error("SUPER_ADMIN_PASSWORD must be at least 12 characters");
}

const adapter = new PrismaPg({
  connectionString: databaseUrl,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 1,
});
const prisma = new PrismaClient({ adapter });

try {
  const existing = await prisma.admin.findFirst({
    where: { role: "SUPER_ADMIN" },
    select: { id: true, email: true },
  });

  if (existing) {
    throw new Error(`A super admin already exists: ${existing.email}`);
  }

  const existingEmail = await prisma.admin.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingEmail) {
    throw new Error("An admin with this email already exists");
  }

  const admin = await prisma.admin.create({
    data: {
      fullName,
      email,
      passwordHash: await hashPassword(password),
      role: "SUPER_ADMIN",
    },
    select: { id: true, email: true, role: true },
  });

  console.log(`Created ${admin.role}: ${admin.email} (${admin.id})`);
} finally {
  await prisma.$disconnect();
}
