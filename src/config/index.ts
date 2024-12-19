import {
	GetSecretValueCommand,
	SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import type { Static, TObject, TProperties } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

export enum DeploymentType {
	fargate = "fargate",
	lambda = "lambda",
}

export type ConfigOpts<ExpectedConfig extends TProperties> = {
	deploymentType: DeploymentType;
	serviceName: string;
	expectedConfig: TObject<ExpectedConfig>;
	region: string;
};

const AWS_SECRETS_EXTENSION_HTTP_PORT = 2773;
const AWS_SECRETS_EXTENSION_SERVER_ENDPOINT = `http://localhost:${AWS_SECRETS_EXTENSION_HTTP_PORT}/secretsmanager/get?secretId=`;

export class Config<ExpectedConfig extends TProperties> {
	loadedConfig?: Static<TObject<ExpectedConfig>> = undefined;
	awsSecretClient: SecretsManagerClient;

	constructor(private readonly opts: ConfigOpts<ExpectedConfig>) {
		this.awsSecretClient = new SecretsManagerClient({ region: opts.region });
	}

	load = async () => {
		if (this.loadedConfig) return this.loadedConfig;

		const localConfig = this.loadConfigLocally();
		const secretConfig =
			process.env.NODE_ENV !== "local" ? await this.loadSecretConfig() : {};

		const rawConfig = {
			...Object.fromEntries(
				Object.entries(secretConfig).filter(([_, v]) => v !== undefined),
			),
			...localConfig,
		};

		this.loadedConfig = Value.Decode(this.opts.expectedConfig, rawConfig);

		return this.loadedConfig;
	};

	get secretName() {
		return `${this.opts.serviceName}-${process.env.NODE_ENV}/doppler`;
	}

	loadSecretConfig = async () => {
		if (this.opts.deploymentType === DeploymentType.fargate) {
			return this.loadConfigFromAwsSecrets();
		}

		return this.loadConfigFromLambda();
	};

	loadConfigLocally = () => {
		const properties = Object.keys(this.opts.expectedConfig.properties);
		const result: Record<string, string | undefined> = {};
		properties.forEach((key) => {
			if (!process.env[key]) return;
			result[key] = process.env[key];
		});
		return result;
	};

	loadConfigFromAwsSecrets = async (): Promise<Record<string, string>> => {
		const command = new GetSecretValueCommand({ SecretId: this.secretName });
		const response = await this.awsSecretClient.send(command);

		if (!response.SecretString)
			throw new Error("AWS secret not available as string");

		return JSON.parse(response.SecretString);
	};

	loadConfigFromLambda = async () => {
		const url = `${AWS_SECRETS_EXTENSION_SERVER_ENDPOINT}${this.secretName}`;
		const sessionToken = process.env.AWS_SESSION_TOKEN;

		if (!sessionToken)
			throw new Error("No session token found to retrieve secrets");

		const response = await fetch(url, {
			method: "GET",
			headers: {
				"X-Aws-Parameters-Secrets-Token": sessionToken,
			},
		});

		if (!response.ok) {
			throw new Error(
				`Error occured while requesting secret ${this.secretName}. Responses status was ${response.status}`,
			);
		}

		const secretContent = (await response.json()) as { SecretString: string };

		return JSON.parse(secretContent.SecretString);
	};
}
