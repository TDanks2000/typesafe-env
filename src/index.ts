import { z } from "zod";

export type CreateEnvOptions<TSchema extends z.ZodTypeAny> = {
	schema: TSchema;
	runtimeEnv: Record<keyof z.infer<TSchema>, unknown>;
	/**
	 * Defaults to true: disallow unknown keys (helps catch typos).
	 * Only works if schema is a ZodObject.
	 */
	strict?: boolean;
	/**
	 * Customize error output.
	 */
	onError?: (error: z.ZodError) => never;
};

function defaultFormatZodError(error: z.ZodError): string {
	return error.issues
		.map((i) => {
			const path = i.path.length ? i.path.join(".") : "(root)";
			return `${path}: ${i.message}`;
		})
		.join("\n");
}

export function createEnv<TSchema extends z.ZodTypeAny>(
	opts: CreateEnvOptions<TSchema>,
): z.infer<TSchema> {
	const { schema, runtimeEnv, strict = true, onError } = opts;

	// If schema is an object, optionally make it strict.
	const finalSchema =
		strict && schema instanceof z.ZodObject
			? (schema.strict() as unknown as TSchema)
			: schema;

	const parsed = finalSchema.safeParse(runtimeEnv);

	if (!parsed.success) {
		if (onError) return onError(parsed.error);

		const msg = defaultFormatZodError(parsed.error);
		throw new Error(`Invalid environment variables:\n${msg}`);
	}

	return parsed.data;
}

export { z };
