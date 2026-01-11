import { describe, expect, it } from "bun:test";
import { z } from "zod";
import { createEnv } from "../src/index";

describe("createEnv with Bun.env", () => {
	it("loads env from --env-file and validates via zod", () => {
		const env = createEnv({
			schema: z.object({
				DATABASE_URL: z.string().url(),
				PORT: z.coerce.number().int(),
				LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]),
			}),
			runtimeEnv: {
				DATABASE_URL: Bun.env.DATABASE_URL,
				LOG_LEVEL: Bun.env.LOG_LEVEL,
				PORT: Bun.env.PORT,
			},
			// Bun.env has lots of keys (PATH, HOME, etc) so strict would fail.
			strict: false,
		});

		expect(env.DATABASE_URL).toBe("https://example.com/test-db");
		expect(env.PORT).toBe(4321);
		expect(env.LOG_LEVEL).toBe("debug");
	});
});
