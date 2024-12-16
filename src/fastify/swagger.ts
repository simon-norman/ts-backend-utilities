import swagger, { type FastifyDynamicSwaggerOptions } from "@fastify/swagger";
import swaggerUI, {
	FastifySwaggerUiConfigOptions,
	type FastifySwaggerUiOptions,
} from "@fastify/swagger-ui";
import type { FastifyInstance } from "fastify";

export type SwaggerOpts = {
	originalSwagger?: FastifyDynamicSwaggerOptions;
	name: string;
	originalSwaggerUi?: FastifySwaggerUiOptions;
};

export const setupFastifySwagger = async (
	server: FastifyInstance,
	opts: SwaggerOpts,
) => {
	await server.register(swagger, {
		swagger: {
			info: {
				title: `${opts.name} API`,
				description: "API documentation",
				version: "1.0.0",
			},
		},
		...opts.originalSwagger,
	});

	await server.register(swaggerUI, {
		routePrefix: "/docs",
		...opts.originalSwaggerUi,
	});
};
