import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { BackendError } from "src/errors/backend-error";

export const addErrorHandler = (server: FastifyInstance) => {
	server.setErrorHandler((error, request, reply) => {
		let publicMessage = "Sorry, something went wrong";
		let statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
		let data = undefined;
		if (error instanceof BackendError) {
			publicMessage = error.params.publicErrMessage;
			statusCode = error.params.httpStatusCode || statusCode;
			data = error.params.publicMetadata;
		}

		request.log.error(error);

		reply.status(statusCode).send({
			statusCode,
			message: publicMessage,
			data,
		});
	});
};
