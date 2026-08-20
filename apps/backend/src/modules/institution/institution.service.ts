import type { PrismaClient } from "../../generated/prisma/client.js";

export interface InstitutionData {
  id: string;
  name: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export function createInstitutionService(prisma: PrismaClient) {
  return {
    async findAll() {
      return prisma.institution.findMany({
        orderBy: { createdAt: "desc" },
      });
    },

    async create(data: { name: string }) {
      return prisma.institution.create({
        data: { name: data.name },
      });
    },

    async delete(id: string) {
      return prisma.institution.delete({
        where: { id },
      });
    },

    async findById(id: string) {
      return prisma.institution.findUnique({
        where: { id },
      });
    },
  };
}
