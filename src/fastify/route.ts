import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import type { Static, TSchema } from "@sinclair/typebox";
import type {
	FastifyBaseLogger,
	FastifyInstance,
	RawReplyDefaultExpression,
	RawRequestDefaultExpression,
	RawServerDefault,
	RouteOptions,
} from "fastify";

export type SchemaTypes<
	T extends {
		body?: TSchema;
		querystring?: TSchema;
		params?: TSchema;
		response?: { [K in number | string]: TSchema };
	},
> = {
	Body: T["body"] extends TSchema ? Static<T["body"]> : never;
	Querystring: T["querystring"] extends TSchema
		? Static<T["querystring"]>
		: never;
	Params: T["params"] extends TSchema ? Static<T["params"]> : never;
	Reply: T["response"] extends { [K in number | string]: TSchema }
		? {
				[K in keyof T["response"]]: T["response"][K] extends TSchema
					? Static<T["response"][K]>
					: never;
			}
		: never;
};

export type FastifyTypebox = FastifyInstance<
	RawServerDefault,
	RawRequestDefaultExpression<RawServerDefault>,
	RawReplyDefaultExpression<RawServerDefault>,
	FastifyBaseLogger,
	TypeBoxTypeProvider
>;
