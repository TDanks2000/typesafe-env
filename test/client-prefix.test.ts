import { describe, expect, it } from "bun:test";
import { z } from "zod";
import { createEnv } from "../src/index";
import { createRuntimeEnvWithExtras, mockBrowserEnvironment } from "./utils";

describe("Client prefix filtering", () => {
	it("filters vars by prefix when on client", () => {
		mockBrowserEnvironment(() => {
			const env = createEnv({
				schema: z.object({
					NEXT_PUBLIC_API: z.string(),
				}),
				runtimeEnv: createRuntimeEnvWithExtras(
					{
						NEXT_PUBLIC_API: "https://api.example.com",
					},
					{
						DATABASE_URL: "https://db.example.com",
					},
				),
				clientPrefix: "NEXT_PUBLIC_",
				strict: false,
			});

			expect(env.NEXT_PUBLIC_API).toBe("https://api.example.com");
		});
	});

	it("does not filter when no prefix specified", () => {
		const env = createEnv({
			schema: z.object({
				API_KEY: z.string(),
			}),
			runtimeEnv: {
				API_KEY: "key123",
			},
		});

		expect(env.API_KEY).toBe("key123");
	});

	it("works with multiple prefix formats", () => {
		mockBrowserEnvironment(() => {
			const env1 = createEnv({
				schema: z.object({
					VITE_API: z.string(),
				}),
				runtimeEnv: {
					VITE_API: "vite-value",
				},
				clientPrefix: "VITE_",
			});

			expect(env1.VITE_API).toBe("vite-value");

			const env2 = createEnv({
				schema: z.object({
					PUBLIC_KEY: z.string(),
				}),
				runtimeEnv: {
					PUBLIC_KEY: "public-value",
				},
				clientPrefix: "PUBLIC_",
			});

			expect(env2.PUBLIC_KEY).toBe("public-value");
		});
	});
});
