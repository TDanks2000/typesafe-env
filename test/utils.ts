// test/utils.ts
/** biome-ignore-all lint/suspicious/noExplicitAny: Test utilities require bypassing type safety to mock browser/server environments by manipulating globalThis.window */

/**
 * Mock browser environment for testing
 * Temporarily sets window to an empty object to simulate client-side execution
 */
export function mockBrowserEnvironment(fn: () => void): void {
	const originalWindow = (globalThis as any).window;
	(globalThis as any).window = {};

	try {
		fn();
	} finally {
		(globalThis as any).window = originalWindow;
	}
}

/**
 * Mock server environment for testing
 * Temporarily removes window to simulate server-side execution
 */
export function mockServerEnvironment(fn: () => void): void {
	const originalWindow = (globalThis as any).window;
	(globalThis as any).window = undefined;

	try {
		fn();
	} finally {
		(globalThis as any).window = originalWindow;
	}
}

/**
 * Type helper for testing with extra env vars that should be filtered
 * Allows passing additional keys to runtimeEnv while maintaining type safety
 * for the expected keys. Useful for testing client-side filtering behavior.
 *
 * @example
 * createRuntimeEnvWithExtras(
 *   { VITE_API_URL: "https://api.example.com" },
 *   { SECRET_KEY: "should-be-filtered" }
 * )
 */
export function createRuntimeEnvWithExtras<T extends Record<string, unknown>>(
	env: T,
	extras: Record<string, unknown>,
): T {
	return { ...env, ...extras } as T;
}
