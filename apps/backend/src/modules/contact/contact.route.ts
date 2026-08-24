import type { FastifyPluginAsync } from "fastify";
import { validateContactForm, type ContactForm } from "./contact.schema.js";
import { logContactSubmission } from "./contact.service.js";

interface ContactBody extends ContactForm {}

interface ValidationError {
  message: string;
  errors: Record<string, string>;
}

export const contactRoute: FastifyPluginAsync = async (app) => {
  app.post<{ Body: ContactBody }>("/", async (request, reply) => {
    try {
      const body = request.body;
      const errors = validateContactForm(body);

      if (Object.keys(errors).length > 0) {
        return reply.code(400).send({ message: "Validation failed.", errors });
      }

      await logContactSubmission({
        name: body.name,
        email: body.email,
        category: body.category,
        subject: body.subject,
      });

      return reply.send({ message: "Message received." });
    } catch (err) {
      app.log.error({ err }, "Contact API error");
      return reply.code(400).send({ message: "Invalid request." });
    }
  });
};
