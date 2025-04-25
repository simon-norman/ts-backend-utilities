import { NumberOptions, Type as t } from "@sinclair/typebox";
import { defaultValidation } from "./default-validation";

export const defaultNumeric = t.Number(defaultValidation);

export const defaultNumber = (options?: NumberOptions) => {
	return t.Number({
		...options,
	});
};
