import Fastify from "fastify";
import {
  attendanceRoutes,
  inPersonRoutes,
} from "./modules/attendance/index.js";
import { delegationRoutes } from "./modules/attendance/delegation.route.js";
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

  // Digital Asset Links — lets Android's Credential Manager trust the mobile
  // app to create/use passkeys scoped to this domain (env.webauthnRpId). Must
  // be reachable, unauthenticated, at the site root — not under apiPrefix.
  // Only the debug keystore's fingerprint is listed here; the release
  // keystore's SHA-256 must be added before a Play Store release build ships,
  // or passkeys will silently fail to verify for real users while continuing
  // to work in debug builds.
  app.get("/.well-known/assetlinks.json", async (_request, reply) => {
    reply.header("Content-Type", "application/json");
    return [
      {
        relation: [
          "delegate_permission/common.handle_all_urls",
          "delegate_permission/common.get_login_creds",
        ],
        target: {
          namespace: "android_app",
          package_name: "com.markwise",
          sha256_cert_fingerprints: [
            "FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C",
          ],
        },
      },
    ];
  });
  app.register(attendanceRoutes, { prefix: `${apiPrefix}/attendance` });
  app.register(inPersonRoutes, { prefix: `${apiPrefix}/attendance/in-person` });
  app.register(delegationRoutes, { prefix: `${apiPrefix}/attendance/delegations` });
  app.register(academicsModule, { prefix: apiPrefix });

  app.register(bleModule, { prefix: `${apiPrefix}/ble` });
  app.register(contactModule, { prefix: `${apiPrefix}/contact` });
  app.register(institutionModule, { prefix: `${apiPrefix}/institutions` });
  app.register(lecturerModule, { prefix: `${apiPrefix}/lecturers` });
  app.register(notificationModule, { prefix: `${apiPrefix}/notifications` });
  app.register(studentModule, { prefix: `${apiPrefix}/students` });

  return app;
}
