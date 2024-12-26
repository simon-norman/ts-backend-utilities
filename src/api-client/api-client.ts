import axios, {
	type AxiosRequestConfig,
	type AxiosInstance,
	type CreateAxiosDefaults,
} from "axios";
import { type AuthClientParams, BackendAuthClient } from "./auth-client";

export type ApiClientParams = {
	axiosConfig?: CreateAxiosDefaults;
	auth: AuthClientParams;
};

export class ApiClient {
	private readonly client: AxiosInstance;
	private readonly authClient: BackendAuthClient;

	constructor(private readonly params: ApiClientParams) {
		this.client = axios.create({
			...params.axiosConfig,
		});
		this.authClient = new BackendAuthClient(params.auth);
	}

	async request(config: AxiosRequestConfig) {
		const header = await this.authClient.authHeader();
		const response = await this.client.request({
			...config,
			headers: {
				...header,
				...config.headers,
			},
		});

		return response.data;
	}
}
