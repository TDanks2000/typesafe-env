import { describe, expect, it } from "bun:test";
import { z } from "zod";
import { createEnv } from "../src/index";
import {
	createRuntimeEnvWithExtras,
	mockBrowserEnvironment,
	mockServerEnvironment,
} from "./utils";

describe("Security features", () => {
	it("throws when server-only env is accessed on simulated client", () => {
		mockBrowserEnvironment(() => {
			expect(() => {
				createEnv({
					schema: z.object({
						DATABASE_URL: z.string(),
					}),
					runtimeEnv: {
						DATABASE_URL: "https://db.example.com",
					},
					isServer: true,
				});
			}).toThrow(/server-only environment variables on the client/i);
		});
	});

	it("allows server-only env on server (no window)", () => {
		mockServerEnvironment(() => {
			const env = createEnv({
				schema: z.object({
					DATABASE_URL: z.string(),
				}),
				runtimeEnv: {
					DATABASE_URL: "https://db.example.com",
				},
				isServer: true,
			});

			expect(env.DATABASE_URL).toBe("https://db.example.com");
		});
	});

	it("filters client vars by prefix on simulated client", () => {
		mockBrowserEnvironment(() => {
			const env = createEnv({
				schema: z.object({
					VITE_API_URL: z.string(),
				}),
				runtimeEnv: createRuntimeEnvWithExtras(
					{
						VITE_API_URL: "https://api.example.com",
					},
					{
						SECRET_KEY: "should-be-filtered",
					},
				),
				clientPrefix: "VITE_",
				isServer: false,
				strict: false,
			});

			expect(env.VITE_API_URL).toBe("https://api.example.com");
		});
	});

	it("does not filter on server side", () => {
		mockServerEnvironment(() => {
			const env = createEnv({
				schema: z.object({
					VITE_API_URL: z.string(),
					SECRET_KEY: z.string(),
				}),
				runtimeEnv: {
					VITE_API_URL: "https://api.example.com",
					SECRET_KEY: "secret",
				},
				clientPrefix: "VITE_",
				strict: false,
			});

			expect(env.VITE_API_URL).toBe("https://api.example.com");
			expect(env.SECRET_KEY).toBe("secret");
		});
	});
});
