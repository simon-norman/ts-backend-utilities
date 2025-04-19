import type { FastifyHelmetOptions } from "@fastify/helmet";
import type { TProperties } from "@sinclair/typebox";
import fastify, {
	type FastifyBaseLogger,
	type FastifyHttpOptions,
	type FastifyInstance,
	type RawServerDefault,
} from "fastify";
import { Config, type ConfigOpts } from "src/config";
import { Logger } from "src/logging/logger";
import { getLoggerOptions, setupCustomFastifyLogger } from "./api-logger";
import { type AuthConfig, setupAuth } from "./auth";
import { type CorsOptions, addCors } from "./cors";
import { addErrorHandler } from "./error-handler";
import { type DetailedHealthCheck, setHealthCheck } from "./health-check";
import { addHelmet } from "./helmet";
import { type SwaggerOpts, setupFastifySwagger } from "./swagger";

type FastifyOptions<ExpectedConfig extends TProperties> = {
	/** original fastify options - will override all other options - way to fully customise server */
	original?: FastifyHttpOptions<RawServerDefault, FastifyBaseLogger>;
	/** default is true */
	includeLogger?: boolean;
	portNumber: number;
	appName: string;
	/** if blank, will not load config. Pass in typebox schema and other config settings to load
	 * NOTE - YOU MUST CALL loadConfig() before using the loaded config, otherwise will not be initialized
	 * loadConfig is NOT called in start() method as you will probably need the loaded config for other setup
	 * before you tell the server to start
	 * Access the config with fastifyApi.config.loadedConfig
	 */
	config?: ConfigOpts<ExpectedConfig>;
	globalLogContext?: Record<string, unknown>;
};

type StartOptions = {
	/** if false, no auth used, default is to enable */
	authConfig: AuthConfig | false;
	/** if false, no swagger added, default is to enable */
	swagger?: SwaggerOpts | false;
	/** default is to enable */
	includeErrorHandler?: boolean;
	routes: (fastify: FastifyInstance) => Promise<void>;
	/** leave blank for default health check, or pass detailed to detailed health check as well */
	healthCheck?: { detailedHealthCheck: DetailedHealthCheck } | false;
	cors: CorsOptions;
	/** default is to enable */
	helmet?: FastifyHelmetOptions | false;
	/** default is true. would be set to false for example to use in a lambda
	 * where requests are injected into the instance from the lambda event
	 * rather than going through the network
	 */
	runAsServer?: boolean;
};

/**
 * FastifyApi is a wrapper around Fastify that provides a more opinionated setup.
 * It includes authentication, swagger generation, cors, a health check etc.
 * Generally can be used to setup a standard api with very little configuration.
 *
 * @description
 * This class provides a standardized configuration for Fastify applications,
 * bundling common middleware and configurations while allowing for customization.
 *
 * @example
 * ```typescript
 * const fastifyApi = new FastifyApi(opts);
 * fastifyApi.loadConfig();
 * // Add custom setup
 * await fastifyApi.start();
 * ```
 *
 * @remarks
 * You can escape/disable/override the opinionated setup by either:
 * - Passing override options (e.g. originalSwagger options)
 * - Passing false to disable specific features
 * - Setting up elements manually outside the class
 *
 * Custom plugins can be added directly to the underlying Fastify instance:
 * ```typescript
 * fastifyApi.api.register(myCustomPlugin);
 * ```
 *
 * If you find yourself completely overriding / altering the opinionated setup,
 * just use Fastify directly. You can use the individual helper functions in this module to provide
 * partial opinionated setup as well.
 *
 * @todo
 * - Add rate limiting
 * - Implement graceful shutdown
 */
export class FastifyApi<ExpectedConfig extends TProperties> {
	public readonly api: FastifyInstance;
	public readonly customLog: Logger;
	public config?: Config<ExpectedConfig>;
	constructor(public readonly opts: FastifyOptions<ExpectedConfig>) {
		const loggingOptions =
			opts.includeLogger === false ? false : getLoggerOptions();

		this.api = fastify({ logger: loggingOptions, ...opts.original });
		this.customLog = new Logger(
			this.api.log,
			opts.appName,
			opts.globalLogContext,
		);

		if (opts.config) {
			this.config = new Config({ ...opts.config, logger: this.customLog });
		}
	}

	async start(startOpts: StartOptions) {
		try {
			setupCustomFastifyLogger(
				this.api,
				this.opts.appName,
				this.opts.globalLogContext,
			);

			await this.setupErrorHandler(startOpts);

			await this.setupHealthCheck(startOpts);

			await this.setupSwagger(startOpts);

			await addCors(this.api, startOpts.cors);

			await addHelmet(this.api);

			await this.setupAuth(startOpts);

			await this.api.register(startOpts.routes);

			if (startOpts.runAsServer !== false) {
				await this.api.listen({ port: this.opts.portNumber });
			} else {
				return this.api;
			}
		} catch (err) {
			this.customLog.log({
				msg: `Failed to start server - ${this.opts.appName}`,
				level: "error",
				code: "FAILED_TO_START_SERVER",
				error: err,
			});
			process.exit(1);
		}
	}

	async setupHelmet(start: StartOptions) {
		if (start.helmet === false) return;

		await addHelmet(this.api, start.helmet);
	}

	async loadConfig() {
		if (!this.config) return;

		await this.config.load();
	}

	async setupHealthCheck(start: StartOptions) {
		if (start.healthCheck === false) return;
		await setHealthCheck(this.api, start.healthCheck);
	}

	async setupErrorHandler(start: StartOptions) {
		if (start.includeErrorHandler === false) return;

		await addErrorHandler(this.api);
	}

	async setupSwagger(start: StartOptions) {
		if (start.swagger === false) return;

		await setupFastifySwagger(
			this.api,
			start.swagger ?? { name: this.opts.appName },
		);
	}

	async setupAuth(start: StartOptions) {
		if (start.authConfig) {
			await setupAuth(this.api, start.authConfig);
		} else {
			this.customLog.log({
				msg: "**No auth setup for this server, all routes will be public / exposed**",
				level: "warn",
				code: "NO_AUTH_SETUP_FOR_SERVER",
			});
		}
	}
}
