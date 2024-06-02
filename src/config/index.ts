import {
	GetSecretValueCommand,
	ListSecretsCommand,
	SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { type Static, Type as T, type TObject } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

export enum DeploymentType {
	fargate = "fargate",
	lambda = "lambda",
}

const AWS_SECRETS_EXTENSION_HTTP_PORT = 2773;
const AWS_SECRETS_EXTENSION_SERVER_ENDPOINT = `http://localhost:${AWS_SECRETS_EXTENSION_HTTP_PORT}/secretsmanager/get?secretId=`;

export class Config<ExpectedConfig> {
	loadedConfig?: ExpectedConfig = undefined;
	awsSecretClient: SecretsManagerClient;

	constructor(
		private readonly deploymentType: DeploymentType,
		private readonly serviceName: string,
		private readonly expectedConfig: TObject,
		private readonly unsecretKeys: string[],
		region: string,
	) {
		this.awsSecretClient = new SecretsManagerClient({ region });
	}

	load = async () => {
		if (this.loadedConfig) return this.loadedConfig;

		let rawConfig = undefined;
		if (process.env.NODE_ENV === "local") {
			rawConfig = this.loadConfigLocally();
		} else {
			rawConfig = await this.loadConfigFromAwsSecrets();
		}

		rawConfig = {
			...rawConfig,
			...this.loadUnsecretConfig(),
		};

		this.loadedConfig = Value.Decode(this.expectedConfig, rawConfig);

		return this.loadedConfig;
	};

	get secretName() {
		return `${this.serviceName}-${process.env.NODE_ENV}/doppler`;
	}

	loadSecretConfig = async () => {
		if (this.deploymentType === DeploymentType.fargate) {
			return this.loadConfigFromAwsSecrets();
		}

		return this.loadConfigFromLambda();
	};

	loadUnsecretConfig = () => {
		const result: Record<string, string | undefined> = {};
		this.unsecretKeys.forEach((key) => {
			result[key] = process.env[key];
		});
		return result;
	};

	loadConfigLocally = () => {
		const properties = Object.keys(this.expectedConfig.properties);
		const result: Record<string, string | undefined> = {};
		properties.forEach((key) => {
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
