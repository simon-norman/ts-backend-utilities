import type { Static, TObject, TSchema } from "@sinclair/typebox";
import t from "@sinclair/typebox";
import type { FastifyInstance, RouteOptions } from "fastify";

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
