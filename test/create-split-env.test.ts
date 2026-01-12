import { describe, expect, it } from "bun:test";
import { z } from "zod";
import { createSplitEnv } from "../src/index";

describe("createSplitEnv", () => {
	it("validates and merges server and client schemas", () => {
		const env = createSplitEnv({
			server: z.object({
				DATABASE_URL: z.string().url(),
				API_SECRET: z.string().min(32),
			}),
			client: z.object({
				VITE_API_URL: z.string().url(),
			}),
			runtimeEnv: {
				DATABASE_URL: "https://db.example.com",
				API_SECRET: "super-secret-key-at-least-32-chars-long",
				VITE_API_URL: "https://api.example.com",
			},
			clientPrefix: "VITE_",
		});

		expect(env.DATABASE_URL).toBe("https://db.example.com");
		expect(env.API_SECRET).toBe("super-secret-key-at-least-32-chars-long");
		expect(env.VITE_API_URL).toBe("https://api.example.com");
	});

	it("filters client vars by prefix", () => {
		const env = createSplitEnv({
			server: z.object({
				SECRET_KEY: z.string(),
			}),
			client: z.object({
				NEXT_PUBLIC_API: z.string(),
			}),
			runtimeEnv: {
				SECRET_KEY: "secret",
				NEXT_PUBLIC_API: "https://api.example.com",
			},
			clientPrefix: "NEXT_PUBLIC_",
		});

		expect(env.SECRET_KEY).toBe("secret");
		expect(env.NEXT_PUBLIC_API).toBe("https://api.example.com");
	});

	it("throws if client prefix is missing from client vars", () => {
		expect(() => {
			createSplitEnv({
				server: z.object({
					DATABASE_URL: z.string(),
				}),
				client: z.object({
					API_URL: z.string(), // Missing VITE_ prefix
				}),
				runtimeEnv: {
					DATABASE_URL: "https://db.example.com",
					API_URL: "https://api.example.com",
				},
				clientPrefix: "VITE_",
			});
		}).toThrow();
	});

	it("supports skipValidation flag", () => {
		const env = createSplitEnv({
			server: z.object({
				DATABASE_URL: z.string().url(),
			}),
			client: z.object({
				VITE_API_URL: z.string().url(),
			}),
			runtimeEnv: {
				DATABASE_URL: "invalid-url",
				VITE_API_URL: "also-invalid",
			},
			clientPrefix: "VITE_",
			skipValidation: true,
		});

		expect(env.DATABASE_URL).toBe("invalid-url");
		expect(env.VITE_API_URL).toBe("also-invalid");
	});

	it("returns frozen object", () => {
		const env = createSplitEnv({
			server: z.object({
				SECRET: z.string(),
			}),
			client: z.object({
				VITE_PUBLIC: z.string(),
			}),
			runtimeEnv: {
				SECRET: "secret",
				VITE_PUBLIC: "public",
			},
			clientPrefix: "VITE_",
		});

		expect(() => {
			// @ts-expect-error - testing runtime behavior
			env.SECRET = "new-secret";
		}).toThrow();
	});
});
