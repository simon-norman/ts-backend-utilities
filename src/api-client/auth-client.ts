import FusionAuthClient from "@fusionauth/typescript-client";
import { AccessToken } from "./access-token";

export type AuthClientParams = {
	clientId: string;
	clientSecret: string;
	host: string;
	applicationId: string;
};

export class BackendAuthClient {
	public accessToken?: AccessToken;
	public fusionAuth: FusionAuthClient;

	constructor(public readonly params: AuthClientParams) {
		// @ts-expect-error
		this.fusionAuth = new FusionAuthClient(null, params.host);
	}

	public async login() {
		const response = await this.fusionAuth.login({
			loginId: this.params.clientId,
			password: this.params.clientSecret,
			applicationId: this.params.applicationId,
		});

		this.accessToken = new AccessToken(
			AccessToken.loadFromResponse(response),
			this.params.host,
		);

		return this.accessToken;
	}

	public async authHeader() {
		let token = this.accessToken;
		if (!token) token = await this.login();

		return token.getHeader();
	}
}
