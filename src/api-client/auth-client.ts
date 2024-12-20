import { assertDefined } from "@breeze32/typescript-utilities";
import FusionAuthClient, {
	type LoginResponse,
	type AccessToken,
} from "@fusionauth/typescript-client";
import { BackendError } from "src/errors/backend-error";
import { ErrorCodes } from "src/errors/error-codes";

type AuthToken = Omit<LoginResponse, "accessToken" | "refreshToken"> & {
	accessToken: string;
	refreshToken: string;
};

export class BackendAuthClient {
	public accessToken?: AuthToken;
	public fusionAuth: FusionAuthClient;

	constructor(public readonly host: string) {
		// @ts-expect-error
		this.fusionAuth = new FusionAuthClient(null, host);
	}

	public async login(clientId: string, clientSecret: string) {
		const response = await this.fusionAuth
			.login({
				loginId: clientId,
				password: clientSecret,
				applicationId: "aff64728-6096-4c47-a824-275b0034e087",
			})
			.catch((error) => {
				throw error;
			});
		if (response.exception) {
			return BackendError.throw("Failed to login", {
				code: ErrorCodes.CLIENT_CREDENTIALS_GRANT_FAILED,
				publicMessage: "Sorry, something went wrong",
			});
		}

		const accessToken = response.response.token;
		const refreshToken = response.response.refreshToken;

		assertDefined(
			accessToken,
			new BackendError("Access token not available", {
				code: ErrorCodes.ACCESS_TOKEN_NOT_IN_CREDENTIALS_RESPONSE,
				publicMessage: "Sorry, something went wrong",
			}),
		);

		assertDefined(
			refreshToken,
			new BackendError("Refresh token not available", {
				code: ErrorCodes.REFRESH_TOKEN_NOT_IN_CREDENTIALS_RESPONSE,
				publicMessage: "Sorry, something went wrong",
			}),
		);

		this.accessToken = {
			...response.response,
			accessToken: accessToken,
			refreshToken: refreshToken,
		};

		return this.accessToken;
	}

	get header() {
		if (!this.accessToken?.accessToken) {
			return {};
		}
		return {
			Authorization: `Bearer ${this.accessToken.accessToken}`,
		};
	}
}

async function foo() {
	const authClient = new BackendAuthClient("http://localhost:9011");
	await authClient.login(
		"5b0dcfea-6476-493b-a6a3-16c19961f6a8",
		"kSRNgjdbfEJpRFmeBFhwFbNUyYIoXgzcDYIDPIHScGVkeFpywr",
	);
}

foo();
