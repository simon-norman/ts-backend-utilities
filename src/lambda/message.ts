export namespace Message {
	export enum Types {
		newLocation = "new-location",
	}

	export type Payload<T> = {
		body: T;
		type: Types;
	};
}
