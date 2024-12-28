import type { SQSEvent, SQSRecord } from "aws-lambda";
import pino from "pino";

const logger = pino({
	formatters: {
		level: (label) => {
			return { level: label.toUpperCase() };
		},
	},
});

export class SqsLambdaHandler<T> {
	constructor(
		private readonly setup: () => Promise<void>,
		private readonly handle: (data: T) => Promise<void>,
	) {}

	async onEvent(event: SQSEvent) {
		await this.setup();
		const failedRecords: SQSRecord[] = [];
		for (const record of event.Records) {
			const body = record.body;

			try {
				const data: T = JSON.parse(body);
				await this.handle(data);
			} catch (error: unknown) {
				const message =
					error instanceof Error ? error.message : "An error occurred";
				logger.error(error, message);
				failedRecords.push(record);
			}
		}

		return {
			batchItemFailures: failedRecords.map((message) => ({
				itemIdentifier: message.messageId,
			})),
		};
	}
}
