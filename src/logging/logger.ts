import { FastifyBaseLogger } from "fastify";
import { Bindings, Level, Logger as PinoLogger } from "pino";

type Log = Record<string, unknown> & {
	msg: string;
	level: Level;
	code?: string;
	error?: unknown;
};

export class Logger {
	constructor(
		private logger: PinoLogger | FastifyBaseLogger,
		service: string,
		meta?: Bindings,
	) {
		this.logger = logger.child({
			level: process.env.LOG_LEVEL,
			service,
			...meta,
		});
	}

	public log(data: Log): void {
		this.logger[data.level](data);
	}

	public setContext(meta: Bindings) {
		this.logger = this.logger.child(meta);
	}
}
