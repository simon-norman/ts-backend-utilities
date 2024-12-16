import cors, { type FastifyCorsOptions } from "@fastify/cors";
import type { FastifyInstance } from "fastify";

export type CorsOptions = {
	/** original cors options, overrides options - way to fully customise */
	originalCors?: FastifyCorsOptions;
	methods: string[] | "all";
	allowedOrigins: string[];
	allowedHeaders: string[];
};

export const addCors = async (server: FastifyInstance, opts: CorsOptions) => {
	await server.register(cors, {
		origin: opts.allowedOrigins,
		methods: opts.methods === "all" ? undefined : opts.methods,
		allowedHeaders: opts.allowedHeaders,
		credentials: true,
		maxAge: 86400,
		preflight: true,
		...opts.originalCors,
	});
};
