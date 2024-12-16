import type { FastifyLoggerOptions } from "fastify";
import type { PinoLoggerOptions } from "fastify/types/logger";

type LoggingOptions = FastifyLoggerOptions & PinoLoggerOptions;

const commonLoggingOptions: LoggingOptions = {
	level: "info",
	serializers: {
		req(request) {
			return {
				method: request.method,
				url: request.url,
				path: request.routeOptions.url,
				parameters: request.params,
				headers: request.headers,
				body: request.body,
			};
		},
		res(reply) {
			return {
				statusCode: reply.statusCode,
			};
		},
	},
};

export enum LoggingEnvironment {
	development = "development",
	tests = "tests",
	production = "production",
}

export const getLoggerOptions = (): LoggingOptions | boolean => {
	const environment =
		(process.env.API_LOGGER_ENVIRONMENT as LoggingEnvironment) ||
		LoggingEnvironment.development;

	if (environment === LoggingEnvironment.development) {
		return {
			transport: {
				target: "pino-pretty",
				options: {
					translateTime: "HH:MM:ss Z",
					ignore: "pid,hostname",
				},
			},
			...commonLoggingOptions,
		};
	}

	if (environment === LoggingEnvironment.tests) {
		return {
			level: "info",
		};
	}

	if (environment === LoggingEnvironment.production) {
		return {
			...commonLoggingOptions,
			redact: [
				"req.headers.authorization",
				"req.headers.cookie",
				'req.headers["x-api-key"]',
				"req.body.password",
				"req.body.*.password",
				"req.body.credit_card",
				"req.body.*.credit_card",
				'req.headers["set-cookie"]',
			],
		};
	}

	return false;
};
