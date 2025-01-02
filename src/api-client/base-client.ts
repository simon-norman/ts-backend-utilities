import axios, {
	type AxiosRequestConfig,
	type AxiosInstance,
	type CreateAxiosDefaults,
} from "axios";

export type BaseClientParams = {
	config?: CreateAxiosDefaults;
};

export class BaseClient {
	private readonly client: AxiosInstance;

	constructor(private readonly params: BaseClientParams) {
		this.client = axios.create({
			...params.config,
		});
	}

	async request<T>(config: AxiosRequestConfig): Promise<T> {
		const response = await this.client.request<T>({
			...config,
			headers: {
				...config.headers,
			},
		});

		return response.data;
	}
}
