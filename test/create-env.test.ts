import { describe, expect, it } from "bun:test";
import { z } from "zod";
import { createEnv } from "../src/index";

describe("createEnv", () => {
	it("returns typed, parsed env on success", () => {
		const env = createEnv({
			schema: z.object({
				PORT: z.coerce.number().int().min(1).max(65535).default(3000),
				DATABASE_URL: z.string().url(),
			}),
			runtimeEnv: {
				PORT: "4000",
				DATABASE_URL: "https://example.com/db",
			},
		});

		expect(env.PORT).toBe(4000);
		expect(env.DATABASE_URL).toBe("https://example.com/db");
	});

	it("applies default values from schema", () => {
		const env = createEnv({
			schema: z.object({
				PORT: z.coerce.number().default(3000),
				DEBUG: z.boolean().default(false),
			}),
			runtimeEnv: {
				PORT: undefined,
				DEBUG: undefined,
			},
		});

		expect(env.PORT).toBe(3000);
		expect(env.DEBUG).toBe(false);
	});

	it("throws with readable message on invalid env", () => {
		expect(() => {
			createEnv({
				schema: z.object({
					DATABASE_URL: z.string().url(),
				}),
				runtimeEnv: {
					DATABASE_URL: "not-a-url",
				},
			});
		}).toThrow(/Invalid environment variables/i);
	});

	it("strict mode rejects unknown keys (for object schemas)", () => {
		expect(() => {
			createEnv({
				schema: z.object({
					DATABASE_URL: z.string().url(),
				}),
				runtimeEnv: {
					DATABASE_URL: "https://example.com",
					// @ts-expect-error - testing runtime behavior
					EXTRA_KEY: "should fail",
				},
				strict: true,
			});
		}).toThrow();
	});

	it("non-strict mode allows unknown keys", () => {
		const env = createEnv({
			schema: z.object({
				DATABASE_URL: z.string().url(),
			}),
			runtimeEnv: {
				DATABASE_URL: "https://example.com",
				// @ts-expect-error - testing runtime behavior
				EXTRA_KEY: "ok",
			},
			strict: false,
		});

		expect(env.DATABASE_URL).toBe("https://example.com");
	});

	it("supports custom error handler", () => {
		expect(() => {
			createEnv({
				schema: z.object({
					PORT: z.coerce.number().int(),
				}),
				runtimeEnv: { PORT: "nope" },
				onError: (err) => {
					throw new TypeError(err.issues[0]?.message ?? "bad env");
				},
			});
		}).toThrow(TypeError);
	});

	it("validates complex schemas with transforms", () => {
		const env = createEnv({
			schema: z.object({
				ALLOWED_ORIGINS: z
					.string()
					.transform((s) => s.split(","))
					.pipe(z.array(z.string().url())),
			}),
			runtimeEnv: {
				ALLOWED_ORIGINS: "https://example.com,https://app.example.com",
			},
		});

		expect(env.ALLOWED_ORIGINS).toEqual([
			"https://example.com",
			"https://app.example.com",
		]);
	});

	it("returns frozen object to prevent mutations", () => {
		const env = createEnv({
			schema: z.object({
				API_KEY: z.string(),
			}),
			runtimeEnv: {
				API_KEY: "secret",
			},
		});

		expect(Object.isFrozen(env)).toBe(true);
		expect(() => {
			// @ts-expect-error - testing runtime behavior
			env.API_KEY = "new-value";
		}).toThrow();
	});

	it("skips validation when skipValidation is true", () => {
		const env = createEnv({
			schema: z.object({
				PORT: z.coerce.number(),
			}),
			runtimeEnv: {
				PORT: "invalid",
			},
			skipValidation: true,
		});

		// @ts-expect-error - skipValidation bypasses type coercion
		expect(env.PORT).toBe("invalid");
	});
});
