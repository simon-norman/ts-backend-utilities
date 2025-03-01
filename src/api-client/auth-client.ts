import FusionAuthClient from "@fusionauth/typescript-client";
import * as fastq from "fastq";
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
	public loginQueue: fastq.queueAsPromised;

	constructor(public readonly params: AuthClientParams) {
		// @ts-expect-error
		this.fusionAuth = new FusionAuthClient(null, params.host);
		this.loginQueue = fastq.promise(this, this.loginWorker, 1);
	}

	public login = async () => {
		await this.loginQueue.push({});

		return this.accessToken as AccessToken;
	};

	public loginWorker = async () => {
		if (this.accessToken) return this.accessToken;

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
	};

	public async authHeader() {
		let token = this.accessToken;
		if (!token) token = await this.login();

		return token.getHeader();
	}
}
