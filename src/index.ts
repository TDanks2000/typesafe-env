import { z } from "zod";

export type CreateEnvOptions<TSchema extends z.ZodTypeAny> = {
	schema: TSchema;
	runtimeEnv?: Record<keyof z.infer<TSchema>, unknown>;
	/**
	 * Defaults to true: disallow unknown keys (helps catch typos).
	 * Only works if schema is a ZodObject.
	 */
	strict?: boolean;
	/**
	 * Skip validation - useful for build-time or when you trust the env.
	 * Defaults to false.
	 */
	skipValidation?: boolean;
	/**
	 * Customize error output.
	 */
	onError?: (error: z.ZodError) => never;
	/**
	 * Which environment to read from.
	 * Defaults to process.env in Node.js environments.
	 */
	envSource?: Record<string, unknown>;
	/**
	 * Client-side prefix filter (e.g., "NEXT_PUBLIC_", "VITE_").
	 * Only keys with this prefix will be validated/exposed on client.
	 */
	clientPrefix?: string;
	/**
	 * Server-side only mode - throws if accessed on client.
	 */
	isServer?: boolean;
};

function defaultFormatZodError(error: z.ZodError): string {
	return error.issues
		.map((i) => {
			const path = i.path.length ? i.path.join(".") : "(root)";
			return `${path}: ${i.message}`;
		})
		.join("\n");
}

function getDefaultEnvSource(): Record<string, unknown> {
	// Support Node.js, Bun, and Vite
	if (typeof process !== "undefined" && process.env) {
		return process.env;
	}
	// @ts-ignore - import.meta may not be defined
	if (typeof import.meta !== "undefined" && import.meta.env) {
		// @ts-ignore
		return import.meta.env;
	}
	return {};
}

function isClientSide(): boolean {
	// @ts-ignore - window may not be defined in Node.js
	return typeof window !== "undefined" && window !== null;
}

export function createEnv<TSchema extends z.ZodTypeAny>(
	opts: CreateEnvOptions<TSchema>,
): Readonly<z.infer<TSchema>> {
	const {
		schema,
		runtimeEnv,
		strict = true,
		skipValidation = false,
		onError,
		envSource,
		clientPrefix,
		isServer,
	} = opts;

	// Security: Prevent server-only vars from being accessed on client
	if (isServer === true && isClientSide()) {
		throw new Error(
			"Attempted to access server-only environment variables on the client. " +
				"This is a security risk. Make sure server env is not imported in client code.",
		);
	}

	// Determine the source of environment variables
	const source = runtimeEnv ?? envSource ?? getDefaultEnvSource();

	// Client-side filtering
	let filteredEnv = source;
	if (clientPrefix) {
		// Only apply filtering on client side or when explicitly not server
		if (isClientSide() || isServer === false) {
			filteredEnv = Object.fromEntries(
				Object.entries(source).filter(([key]) => key.startsWith(clientPrefix)),
			);
		}
	}

	// Skip validation if requested (e.g., during build)
	if (skipValidation) {
		return filteredEnv as z.infer<TSchema>;
	}

	// If schema is an object, optionally make it strict.
	const finalSchema =
		strict && schema instanceof z.ZodObject
			? (schema.strict() as unknown as TSchema)
			: schema;

	const parsed = finalSchema.safeParse(filteredEnv);

	if (!parsed.success) {
		if (onError) return onError(parsed.error);

		const msg = defaultFormatZodError(parsed.error);
		throw new Error(`Invalid environment variables:\n${msg}`);
	}

	// Return a readonly proxy to prevent runtime mutations
	return Object.freeze(parsed.data);
}

// Helper to create split server/client env configs
export function createSplitEnv<
	TServer extends z.ZodObject<z.ZodRawShape>,
	TClient extends z.ZodObject<z.ZodRawShape>,
>(opts: {
	server: TServer;
	client: TClient;
	runtimeEnv: Record<keyof z.infer<TServer> | keyof z.infer<TClient>, unknown>;
	clientPrefix: string;
	skipValidation?: boolean;
	onError?: (error: z.ZodError) => never;
}): Readonly<z.infer<TServer> & z.infer<TClient>> {
	const { server, client, runtimeEnv, clientPrefix, skipValidation, onError } =
		opts;

	const isClient = isClientSide();

	// Security: Only validate and return client vars on client side
	if (isClient) {
		const clientEnv = createEnv({
			schema: client,
			runtimeEnv,
			clientPrefix,
			skipValidation,
			onError,
			isServer: false,
		});

		// Return only client env, but cast to full type for TypeScript
		// Server vars will be undefined at runtime on client
		return clientEnv as unknown as Readonly<
			z.infer<TServer> & z.infer<TClient>
		>;
	}

	// Server side: validate both schemas
	const serverEnv = createEnv({
		schema: server,
		runtimeEnv,
		skipValidation,
		onError,
		isServer: true,
	});

	const clientEnv = createEnv({
		schema: client,
		runtimeEnv,
		clientPrefix,
		skipValidation,
		onError,
		isServer: false,
	});

	// Merge and return
	return { ...serverEnv, ...clientEnv } as Readonly<
		z.infer<TServer> & z.infer<TClient>
	>;
}

export { z };
