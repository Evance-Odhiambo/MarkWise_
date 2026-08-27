import Fastify from "fastify";
import {
  attendanceRoutes,
  inPersonRoutes,
} from "./modules/attendance/index.js";
import { academicsModule } from "./modules/academics/index.js";

import { adminModule } from "./modules/admin/index.js";
import { bleModule } from "./modules/ble/index.js";
import { contactModule } from "./modules/contact/index.js";
import { institutionModule } from "./modules/institution/index.js";
import { lecturerModule } from "./modules/lecturer/index.js";
import { notificationModule } from "./modules/notification/index.js";
import { studentModule } from "./modules/student/index.js";
import {
  corsOptions,
  corsPlugin,
  securityHeadersPlugin,
  rateLimitOptions,
  rateLimitPlugin,
  redisPlugin,
  prismaPlugin,
  authPlugin,
} from "./plugins/index.js";

export function buildApp() {
  const app = Fastify({ logger: true });
  const apiPrefix = "/api/v1";

  app.register(corsPlugin, corsOptions);
  app.register(securityHeadersPlugin);
  app.register(rateLimitPlugin, rateLimitOptions);
  app.register(prismaPlugin);
  app.register(redisPlugin);
  app.register(authPlugin);
  app.register(adminModule, { prefix: `${apiPrefix}/admin` });

  app.get(`${apiPrefix}/health`, async () => ({ status: "ok" }));
  app.register(attendanceRoutes, { prefix: `${apiPrefix}/attendance` });
  app.register(inPersonRoutes, { prefix: `${apiPrefix}/attendance/in-person` });
  app.register(academicsModule, { prefix: apiPrefix });

  app.register(bleModule, { prefix: `${apiPrefix}/ble` });
  app.register(contactModule, { prefix: `${apiPrefix}/contact` });
  app.register(institutionModule, { prefix: `${apiPrefix}/institutions` });
  app.register(lecturerModule, { prefix: `${apiPrefix}/lecturers` });
  app.register(notificationModule, { prefix: `${apiPrefix}/notifications` });
  app.register(studentModule, { prefix: `${apiPrefix}/students` });

  return app;
}
