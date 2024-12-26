import jwt from "@fastify/jwt";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { StatusCodes } from "http-status-codes";
import { BackendError } from "src/errors/backend-error";

export interface AuthConfig {
	publicKey: string;
	applicationId: string;
}

type DecodedToken = {
	roles: string[];
	applicationId: string;
};

export enum AuthErrorCodes {
	INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS",
}

declare module "fastify" {
	interface FastifyRequest {
		authConfig: AuthConfig;
	}
}

export async function setupAuth(app: FastifyInstance, config: AuthConfig) {
	await app.register(jwt, {
		secret: { public: config.publicKey },
	});

	app.decorateRequest("config", null);

	// Add config in a hook (runs before each request)
	app.addHook("onRequest", async (request) => {
		request.authConfig = config;
	});
}

export const authMiddleWare =
	(requiredRoles: string[]) => async (request: FastifyRequest) => {
		try {
			const decoded = await request.jwtVerify<DecodedToken>().catch((err) => {
				return BackendError.reThrow({
					code: AuthErrorCodes.INSUFFICIENT_PERMISSIONS,
					publicMessage:
						"Sorry, you do not have permission to complete this action",
					httpStatusCode: StatusCodes.UNAUTHORIZED,
					originalError: err,
				});
			});

			if (decoded.applicationId !== request.authConfig.applicationId) {
				BackendError.throw("Token application ID does not match this app id", {
					code: AuthErrorCodes.INSUFFICIENT_PERMISSIONS,
					publicMessage:
						"Sorry, you do not have permission to complete this action",
					httpStatusCode: StatusCodes.FORBIDDEN,
				});
			}
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
			if (err instanceof BackendError) {
				throw err;
			}

			BackendError.reThrow({
				code: AuthErrorCodes.INSUFFICIENT_PERMISSIONS,
				publicMessage:
					"Sorry, you do not have permission to complete this action",
				httpStatusCode: StatusCodes.UNAUTHORIZED,
				originalError: err,
			});
		}
	};
