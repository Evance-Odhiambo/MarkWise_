import type { FastifyPluginAsync } from "fastify";
import { findAdminByEmail, hashPassword, verifyPassword } from "./admin.service.js";
import { requireRoles, requireSuperAdmin } from "../../plugins/index.js";

interface LoginBody {
	email: string;
	password: string;
}

interface OnboardingBody {
	contactName: string;
	contactTitle: string;
	email: string;
	institutionName: string;
}

interface ApprovalParams {
	requestId: string;
}

interface ApprovalBody {
	password?: string;
}

interface RegistrationBody {
	contactName: string;
	contactTitle: string;
	email: string;
	institutionName: string;
	password: string;
}

export const adminRoutes: FastifyPluginAsync = async (app) => {
	app.post<{ Body: LoginBody }>("/auth/login", async (request, reply) => {
		const email = request.body.email?.trim().toLowerCase();
		const password = request.body.password;

		if (!email || !password) {
			return reply.code(400).send({ error: "Email and password are required" });
		}

		const admin = await findAdminByEmail(app.prisma, email);
		if (!admin || !(await verifyPassword(password, admin.passwordHash))) {
			return reply.code(401).send({ error: "Invalid credentials" });
		}

		return reply.send({
			id: admin.id,
			name: admin.fullName,
			contactTitle: admin.contactTitle,
			email: admin.email,
			role: admin.role,
			institutionId: admin.institutionId,
			institutionName: admin.institution?.name ?? null,
			token: await app.jwt.sign({
				id: admin.id,
				role: admin.role,
				institutionId: admin.institutionId,
			}),
		});
	});

	app.post<{ Body: OnboardingBody }>("/onboarding", async (request, reply) => {
		const contactName = request.body.contactName?.trim();
		const contactTitle = request.body.contactTitle?.trim();
		const email = request.body.email?.trim().toLowerCase();
		const institutionName = request.body.institutionName?.trim();

		if (!contactName || !contactTitle || !email || !institutionName) {
			return reply.code(400).send({
				error: "Contact name, title/position, email, and institution name are required",
			});
		}

		const existing = await app.prisma.onboardingRequest.findFirst({
			where: { email, status: "PENDING" },
			select: { id: true },
		});

		if (existing) {
			return reply.code(409).send({ error: "An onboarding request is already pending" });
		}

		const onboardingRequest = await app.prisma.onboardingRequest.create({
			data: { contactName, contactTitle, email, institutionName },
			select: { id: true, status: true },
		});

		return reply.code(202).send(onboardingRequest);
	});

	app.post<{ Body: RegistrationBody }>("/auth/institution/register", async (request, reply) => {
		const contactName = request.body.contactName?.trim();
		const email = request.body.email?.trim().toLowerCase();
		const institutionName = request.body.institutionName?.trim();
		const password = request.body.password;

		if (!contactName || !email || !institutionName || !password) {
			return reply.code(400).send({ error: "Contact name, email, institution name, and password are required" });
		}

		if (password.length < 8) {
			return reply.code(400).send({ error: "Password must be at least 8 characters" });
		}

		const onboardingRequest = await app.prisma.onboardingRequest.findFirst({
			where: { email, institutionName, status: "APPROVED" },
			select: { institutionId: true, contactName: true, contactTitle: true, email: true, institutionName: true },
		});

		if (!onboardingRequest?.institutionId) {
			return reply.code(403).send({ error: "This institution request has not been approved" });
		}

		const existingAdmin = await app.prisma.admin.findUnique({ where: { email }, select: { id: true } });
		if (existingAdmin) {
			return reply.code(409).send({ error: "An account already exists for this email" });
		}

		const admin = await app.prisma.admin.create({
			data: {
				fullName: contactName,
				contactTitle: onboardingRequest.contactTitle,
				email,
				passwordHash: await hashPassword(password),
				role: "INSTITUTION_ADMIN",
				institutionId: onboardingRequest.institutionId,
			},
			select: { id: true, email: true, contactTitle: true, institutionId: true },
		});

		return reply.code(201).send({
			success: true,
			admin,
			token: await app.jwt.sign({
				id: admin.id,
				role: "INSTITUTION_ADMIN",
				institutionId: admin.institutionId,
			}),
		});
	});

	app.get(
		"/onboarding",
		{ preHandler: requireSuperAdmin() },
		async (_request, reply) => {
			const requests = await app.prisma.onboardingRequest.findMany({
				where: { status: "PENDING" },
				orderBy: { createdAt: "asc" },
				select: {
					id: true,
					contactName: true,
					contactTitle: true,
					email: true,
					institutionName: true,
					status: true,
					createdAt: true,
				},
			});

			return reply.send({ requests });
		},
	);

	app.post<{ Params: ApprovalParams; Body: ApprovalBody }>(
		"/onboarding/:requestId/approve",
		{ preHandler: requireSuperAdmin() },
		async (request, reply) => {
			const requestId = request.params.requestId;

			const onboardingRequest = await app.prisma.onboardingRequest.findUnique({
				where: { id: requestId },
			});

			if (!onboardingRequest || onboardingRequest.status !== "PENDING") {
				return reply.code(404).send({ error: "Pending onboarding request not found" });
			}

			const result = await app.prisma.$transaction(async (transaction) => {
				const institution = await transaction.institution.create({
					data: { name: onboardingRequest.institutionName },
					select: { id: true, name: true },
				});

				await transaction.onboardingRequest.update({
					where: { id: onboardingRequest.id },
					data: { status: "APPROVED", institutionId: institution.id, reviewedAt: new Date(), reviewedById: request.user.id },
				});

				return { institution };
			});

			return reply.code(201).send({
				...result,
				requester: {
					contactName: onboardingRequest.contactName,
					contactTitle: onboardingRequest.contactTitle,
					email: onboardingRequest.email,
					institutionName: onboardingRequest.institutionName,
				},
			});
		},
	);
};
