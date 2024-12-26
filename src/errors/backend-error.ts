import type { StatusCodes } from "http-status-codes";

type BackendErrorParams<T> = {
	publicMessage: string;
	httpStatusCode?: StatusCodes;
	publicMetadata?: object;
	originalError?: unknown;
	privateMetadata?: object;
	// this should be a very specific, unique code for the error, to facilitate
	// handling specific errors / taking actions off the back of them
	code: T;
};

export class BackendError<T> extends Error {
	constructor(
		message: string,
		public params: BackendErrorParams<T>,
	) {
		super(message);
	}

	public static throw<Y>(
		message: string,
		params: BackendErrorParams<Y>,
	): never {
		throw new BackendError(message, params);
	}

	public static reThrow<Y>(params: BackendErrorParams<Y>): never {
		const message =
			params.originalError instanceof Error
				? params.originalError.message
				: "An error occurred";
		throw new BackendError(message, params);
	}
}
