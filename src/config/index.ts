import {
	GetSecretValueCommand,
	SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import type { Static, TObject, TProperties } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { BackendError } from "src/errors/backend-error";
import { BaseFnParams } from "src/shared";

export enum DeploymentType {
	fargate = "fargate",
	lambda = "lambda",
}

export type ConfigOpts<ExpectedConfig extends TProperties> = BaseFnParams & {
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
		this.opts.logger.log({ level: "info", msg: "Checking if config loaded" });
		if (this.loadedConfig) return this.loadedConfig;

		this.opts.logger.log({ level: "info", msg: "Loading config" });
		const localConfig = this.loadConfigLocally();

		this.opts.logger.log({ level: "info", msg: "Loaded config locally" });
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
		return `${this.opts.serviceName}-${
			process.env.NODE_ENV?.split("-")[0]
		}/doppler`;
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
		this.opts.logger.log({ level: "info", msg: "Loading config from lambda" });

		const url = `${AWS_SECRETS_EXTENSION_SERVER_ENDPOINT}${this.secretName}`;
		const sessionToken = process.env.AWS_SESSION_TOKEN;

		if (!sessionToken)
			throw new Error("No session token found to retrieve secrets");

		this.opts.logger.log({ level: "info", msg: "Fetching secrets" });
		const response = await fetch(url, {
			method: "GET",
			headers: {
				"X-Aws-Parameters-Secrets-Token": sessionToken,
			},
		});

		this.opts.logger.log({
			level: "info",
			msg: "Secrets response",
			metadata: { success: response.ok },
		});
		if (!response.ok) {
			return BackendError.throw(
				`Error occured while requesting secret ${this.secretName}. Responses status was ${response.status}`,
				{
					code: "LAMBDA_FETCH_SECRET_ERROR",
					publicMessage: "Error occured while requesting secret",
					privateMetadata: { errorText: await response.text() },
				},
			);
		}

		const secretContent = (await response.json()) as { SecretString: string };
		this.opts.logger.log({
			level: "info",
			msg: "Loaded secret content",
		});

		return JSON.parse(secretContent.SecretString);
	};
}
