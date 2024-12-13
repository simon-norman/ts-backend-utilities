import type { StatusCodes } from "http-status-codes";

type BackendErrorParams = {
	privateErrMessage: string;
	publicErrMessage: string;
	httpStatusCode?: StatusCodes;
	publicMetadata?: object;
	originalError?: Error;
	privateMetadata?: object;
};

export class BackendError extends Error {
	constructor(
		message: string,
		public params: BackendErrorParams,
	) {
		super(message);
	}

	public static throw(message: string, params: BackendErrorParams) {
		throw new BackendError(message, params);
	}
}
