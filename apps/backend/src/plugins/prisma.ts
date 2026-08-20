import fp from "fastify-plugin";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { env } from "../config/index.js";

declare module "fastify" {
	interface FastifyInstance {
		prisma: PrismaClient;
	}
}

export const prismaPlugin = fp(async (app) => {
	const adapter = new PrismaPg({
		connectionString: env.databaseUrl,
		connectionTimeoutMillis: 5000,
		idleTimeoutMillis: 30000,
		max: env.databasePoolMax,
	});
	const prisma = new PrismaClient({ adapter });

	await prisma.$connect();
	app.decorate("prisma", prisma);

	app.addHook("onClose", async () => {
		await prisma.$disconnect();
	});
});
