import type { FastifyInstance } from "fastify";
import { BackendError } from "src/errors/backend-error";

export type DetailedHealthCheck = () => Promise<Record<string, unknown>>;

type HeathCheckOpts = {
	detailedHealthCheck?: DetailedHealthCheck;
};

export const setHealthCheck = async (
	fastify: FastifyInstance,
	opts?: HeathCheckOpts,
) => {
	fastify.get("/health", {
		schema: {
			response: {
				200: {
					type: "object",
					properties: {
						status: { type: "string" },
						timestamp: { type: "string" },
					},
				},
			},
		},
		handler: async () => {
			return {
				status: "ok",
				timestamp: new Date().toISOString(),
			};
		},
	});

	if (!opts?.detailedHealthCheck) return;

	fastify.get("/health/details", {
		handler: async () => {
			if (!opts.detailedHealthCheck) {
				return BackendError.throw("No detailed health check available", {
					publicMessage: "No detailed health check available",
					code: "NO_DETAILED_HEALTH_CHECK",
				});
			}
			return opts.detailedHealthCheck();
		},
	});
};
