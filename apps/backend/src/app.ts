import Fastify from "fastify";
import { academicsModule } from "./modules/academics/index.js";
import { adminModule } from "./modules/admin/index.js";
import { bleModule } from "./modules/ble/index.js";
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
	app.register(authPlugin);
	app.register(adminModule, { prefix: `${apiPrefix}/admin` });

	app.get(`${apiPrefix}/health`, async () => ({ status: "ok" }));

	app.register(academicsModule, { prefix: `${apiPrefix}/academics` });
	app.register(bleModule, { prefix: `${apiPrefix}/ble` });
	app.register(institutionModule, { prefix: `${apiPrefix}/institutions` });
	app.register(lecturerModule, { prefix: `${apiPrefix}/lecturers` });
	app.register(notificationModule, { prefix: `${apiPrefix}/notifications` });
	app.register(studentModule, { prefix: `${apiPrefix}/students` });

	return app;
}