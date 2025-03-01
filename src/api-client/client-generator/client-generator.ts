import fs from "fs";
import { Client, Config } from "@hey-api/client-axios";
import { createClient } from "@hey-api/openapi-ts";
import { AuthClientParams, BackendAuthClient } from "../auth-client";
import { BaseClient } from "../base-client";

type GeneratorConfig = {
	docsUrl: string;
	outputDir: string;
};

export const generateClient = async (config: GeneratorConfig) => {
	const apiClient = new BaseClient({ config: { baseURL: config.docsUrl } });
	const docsJson = await apiClient.request({ method: "GET" });

	await fs.promises.writeFile("./open-api.json", JSON.stringify(docsJson));

	await createClient({
		input: "./open-api.json",
		output: config.outputDir,
		plugins: ["@hey-api/client-axios"],
	});
};

type InitConfig = {
	clientConfig: Config;
	auth?: AuthClientParams;
};

export const initGeneratedClient = async (
	client: Client,
	config: InitConfig,
) => {
	if (config.clientConfig) client.setConfig(config.clientConfig);

	if (config.auth) {
		const authClient = new BackendAuthClient(config.auth);

		client.instance.interceptors.request.use(async (config) => {
			const header = await authClient.authHeader();

			config.headers.set("Authorization", header.Authorization);

			return config;
		});
	}
};
