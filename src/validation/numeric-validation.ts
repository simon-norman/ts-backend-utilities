import { Type as t } from "@sinclair/typebox";
import { defaultValidation } from "./default-validation";

export const defaultNumeric = t.Number(defaultValidation);
