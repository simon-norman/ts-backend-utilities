import jwt from "@fastify/jwt";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { StatusCodes } from "http-status-codes";
import { BackendError } from "src/errors/backend-error";

export interface AuthConfig {
	publicKey: string;
}

type DecodedToken = {
	roles: string[];
};

export enum AuthErrorCodes {
	INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS",
}

export async function setupAuth(app: FastifyInstance, config: AuthConfig) {
	await app.register(jwt, {
		secret: { public: config.publicKey },
	});
}

export const authenticate =
	(requiredRoles: string[]) => async (request: FastifyRequest) => {
		try {
			const decoded = await request.jwtVerify<DecodedToken>();
			const userPermissions = decoded.roles;

			if (!requiredRoles.every((role) => userPermissions.includes(role))) {
				BackendError.throw("Insufficient permissions", {
					code: AuthErrorCodes.INSUFFICIENT_PERMISSIONS,
					publicMessage:
						"Sorry, you do not have permission to complete this action",
					httpStatusCode: StatusCodes.FORBIDDEN,
				});
			}
		} catch (err: unknown) {
			BackendError.reThrow({
				code: AuthErrorCodes.INSUFFICIENT_PERMISSIONS,
				publicMessage:
					"Sorry, you do not have permission to complete this action",
				httpStatusCode: StatusCodes.FORBIDDEN,
				originalError: err,
			});
		}
	};
