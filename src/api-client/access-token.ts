import { assertDefined } from "@breeze32/typescript-utilities";
import FusionAuthClient, {
	type JWTRefreshResponse,
	type LoginResponse,
} from "@fusionauth/typescript-client";
import type ClientResponse from "@fusionauth/typescript-client/build/src/ClientResponse";
import fastq from "fastq";
import { BackendError } from "src/errors/backend-error";
import { ErrorCodes } from "src/errors/error-codes";

type AuthToken = Omit<LoginResponse, "accessToken" | "refreshToken"> & {
	accessToken: string;
	refreshToken: string;
};

export class AccessToken {
	public fusionAuth: FusionAuthClient;
	public refreshTokenQueue: fastq.queueAsPromised;

	constructor(
		private data: AuthToken,
		host: string,
	) {
		// @ts-expect-error
		this.fusionAuth = new FusionAuthClient(null, host);
		this.refreshTokenQueue = fastq.promise(this, this.execRefresh, 1);
	}

	checkTokenExpiredOrAboutTo() {
		if (!this.data.tokenExpirationInstant) return false;
		const sixtySeconds = 60 * 1000;

		return this.data.tokenExpirationInstant - sixtySeconds < Date.now();
	}

	static loadFromResponse(
		response:
			| ClientResponse<LoginResponse>
			| ClientResponse<JWTRefreshResponse>,
	) {
		if (response.exception) {
			return BackendError.throw("Failed to refresh token", {
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

		const data = {
			...response.response,
			accessToken: accessToken,
			refreshToken: refreshToken,
		};

		return data;
	}

	async refresh() {
		await this.refreshTokenQueue.push({});
	}

	execRefresh = async () => {
		if (!this.checkTokenExpiredOrAboutTo()) return;

		const response = await this.fusionAuth.exchangeRefreshTokenForJWT({
			refreshToken: this.data.refreshToken,
		});

		this.data = AccessToken.loadFromResponse(response);
	};

	async latestToken() {
		if (this.checkTokenExpiredOrAboutTo()) {
			await this.refresh();
		}

		return this.data.accessToken;
	}

	async getHeader() {
		const token = await this.latestToken();

		return {
			Authorization: `Bearer ${token}`,
		};
	}
}
