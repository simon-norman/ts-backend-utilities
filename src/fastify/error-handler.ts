import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { BackendError } from "src/errors/backend-error";

export const addErrorHandler = (server: FastifyInstance) => {
	server.setErrorHandler((error, request, reply) => {
		let publicMessage = "Sorry, something went wrong";
		let statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
		let data = undefined;
		if (error instanceof BackendError) {
			publicMessage = error.params.publicMessage;
			statusCode = error.params.httpStatusCode || statusCode;
			data = error.params.publicMetadata;
		}

		request.customLog.log({
			level: "error",
			error,
			publicMessage,
			msg: error.message,
			code: error.code,
		});

		reply.status(statusCode).send({
			statusCode,
			message: publicMessage,
			data,
		});
	});
};
