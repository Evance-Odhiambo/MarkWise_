import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { PrismaClient } from "../../generated/prisma/client.js";

const scrypt = promisify(scryptCallback);

export async function hashPassword(password: string): Promise<string> {
	const salt = randomBytes(16).toString("hex");
	const derivedKey = (await scrypt(password, salt, 64)) as Buffer;

	return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
	const [salt, key] = storedHash.split(":");

	if (!salt || !key) return false;

	const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
	const storedKey = Buffer.from(key, "hex");

	return storedKey.length === derivedKey.length && timingSafeEqual(storedKey, derivedKey);
}

export async function findAdminByEmail(prisma: PrismaClient, email: string) {
	return prisma.admin.findUnique({
		where: { email: email.trim().toLowerCase() },
		select: {
			id: true,
			fullName: true,
			email: true,
			passwordHash: true,
			role: true,
			institutionId: true,
			institution: {
				select: { name: true },
			},
		},
	});
}