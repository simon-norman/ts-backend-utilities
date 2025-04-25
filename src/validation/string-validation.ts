import { StringOptions, Type as t } from "@sinclair/typebox";
import { defaultValidation } from "./default-validation";

export const defaultString = t.String(defaultValidation);

export const defaultStr = (options?: StringOptions) => {
	return t.String({
		...defaultValidation,
		...options,
	});
};
