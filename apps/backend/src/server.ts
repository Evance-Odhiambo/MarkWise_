import { buildApp } from "./app.js";
import { env } from "./config/index.js";

const server = buildApp();

const start = async (): Promise<void> => {
  const port = env.port;
  const host = env.host;

  try {
    await server.listen({ port, host });
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
};

void start();


