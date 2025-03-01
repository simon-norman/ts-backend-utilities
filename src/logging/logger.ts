import { FastifyBaseLogger } from "fastify";
import { Bindings, Level, Logger as PinoLogger } from "pino";

type Log = Record<string, unknown> & {
	msg: string;
	level: Level;
	code: string;
	error?: unknown;
};

export class Logger {
	constructor(
		private readonly logger: PinoLogger | FastifyBaseLogger,
		service: string,
		meta?: Bindings,
	) {
		this.logger = logger.child({ service, ...meta });
	}

	public log(data: Log): void {
		this.logger[data.level](data);
	}
}
