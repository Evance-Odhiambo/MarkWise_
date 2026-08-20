import type { FastifyPluginAsync } from "fastify";
import { prismaPlugin } from "../../plugins/index.js";

interface InstitutionCreateBody {
  name: string;
}

interface InstitutionQueryParams {
  id: string;
}

export const institutionRoutes: FastifyPluginAsync = async (app) => {
	app.get("/institutions", async (request, reply) => {
		const institutions = await app.prisma.institution.findMany({
			orderBy: { createdAt: "desc" },
		});

		const formatted = institutions.map((inst) => ({
			id: inst.id,
			name: inst.name,
			metadata: inst.metadata,
		}));

		return reply.send({ institutions: formatted });
	});

	app.post<{ Body: InstitutionCreateBody }>(
		"/institutions",
		async (request, reply) => {
			const { name } = request.body;

			if (!name) {
				return reply.code(400).send({ error: "Institution name is required" });
			}

			const institution = await app.prisma.institution.create({
				data: { name },
			});

			return reply.code(201).send({ institution });
		},
	);

	app.delete<{ Querystring: InstitutionQueryParams }>(
		"/institutions",
		async (request, reply) => {
			const { id } = request.query;

			if (!id) {
				return reply.code(400).send({ error: "Institution ID is required" });
			}

			await app.prisma.institution.delete({
				where: { id },
			});

			return reply.send({ success: true });
		},
	);
};
