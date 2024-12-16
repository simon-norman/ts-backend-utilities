import helmet, { type FastifyHelmetOptions } from "@fastify/helmet";
import type { FastifyInstance } from "fastify";

export const addHelmet = (
	server: FastifyInstance,
	opts?: FastifyHelmetOptions,
) => {
	server.register(helmet, {
		global: true,
		contentSecurityPolicy: {
			directives: {
				defaultSrc: ["'self'"],
				scriptSrc: ["'self'"],
				styleSrc: ["'self'", "'unsafe-inline'"],
				imgSrc: ["'self'", "data:", "https:"],
			},
		},
		crossOriginEmbedderPolicy: false, // Might need this for some third-party integrations
		crossOriginResourcePolicy: { policy: "cross-origin" }, // Adjust based on needs
		...opts,
	});
};
