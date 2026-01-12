# @tdanks2000/typesafe-env

Runtime-validated, type-safe environment variables for TypeScript projects.

## Why?

Environment variables are stringly-typed by default. This package gives you:

- **Type safety** - Your env vars have proper types, not just `string | undefined`
- **Runtime validation** - Catch missing or invalid vars before they cause issues
- **Framework agnostic** - Works with Node.js, Vite, Next.js, Bun
- **Security built-in** - Prevents accidental exposure of server secrets to client

## Install

```bash
npm install @tdanks2000/typesafe-env zod
```

```bash
pnpm add @tdanks2000/typesafe-env zod
```

```bash
yarn add @tdanks2000/typesafe-env zod
```

```bash
bun add @tdanks2000/typesafe-env zod
```

## Quick Start

Create an `env.ts` file:

```ts
import { createEnv, z } from "@tdanks2000/typesafe-env";

export const env = createEnv({
  schema: z.object({
    DATABASE_URL: z.string().url(),
    PORT: z.coerce.number().default(3000),
    NODE_ENV: z.enum(["development", "production", "test"]),
  }),
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    PORT: process.env.PORT,
    NODE_ENV: process.env.NODE_ENV,
  },
});

// env is now fully typed and validated!
console.log(env.DATABASE_URL); // string
console.log(env.PORT); // number
```

## Split Server/Client Config

For apps with both server and client code (Next.js, SvelteKit, etc):

```ts
import { createSplitEnv, z } from "@tdanks2000/typesafe-env";

export const env = createSplitEnv({
  server: z.object({
    DATABASE_URL: z.string(),
    API_SECRET: z.string(),
  }),
  client: z.object({
    VITE_API_URL: z.string().url(),
    VITE_PUBLIC_KEY: z.string(),
  }),
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    API_SECRET: process.env.API_SECRET,
    VITE_API_URL: import.meta.env.VITE_API_URL,
    VITE_PUBLIC_KEY: import.meta.env.VITE_PUBLIC_KEY,
  },
  clientPrefix: "VITE_",
});
```

**Security:** Server vars throw an error if accessed on the client. Client vars are filtered by prefix.

## Options

### `createEnv` options

```ts
createEnv({
  schema: z.object({ ... }),           // Your Zod schema
  runtimeEnv: { ... },                  // Map of env var names to values
  strict?: boolean,                     // Reject unknown keys (default: true)
  skipValidation?: boolean,             // Skip validation (default: false)
  clientPrefix?: string,                // Filter client vars by prefix
  isServer?: boolean,                   // Mark as server-only
  onError?: (error) => never,           // Custom error handler
});
```

### `createSplitEnv` options

```ts
createSplitEnv({
  server: z.object({ ... }),            // Server-only schema
  client: z.object({ ... }),            // Client-safe schema
  runtimeEnv: { ... },                  // Map of all env vars (server + client)
  clientPrefix: string,                 // Required - e.g., "VITE_", "NEXT_PUBLIC_"
  skipValidation?: boolean,             // Skip validation (default: false)
  onError?: (error) => never,           // Custom error handler
});
```

## Examples

### Next.js

```ts
import { createSplitEnv, z } from "@tdanks2000/typesafe-env";

export const env = createSplitEnv({
  server: z.object({
    DATABASE_URL: z.string(),
    STRIPE_SECRET_KEY: z.string(),
  }),
  client: z.object({
    NEXT_PUBLIC_API_URL: z.string(),
  }),
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  clientPrefix: "NEXT_PUBLIC_",
});
```

### Vite

```ts
import { createSplitEnv, z } from "@tdanks2000/typesafe-env";

export const env = createSplitEnv({
  server: z.object({
    DB_PASSWORD: z.string(),
  }),
  client: z.object({
    VITE_APP_TITLE: z.string(),
  }),
  runtimeEnv: {
    DB_PASSWORD: import.meta.env.DB_PASSWORD,
    VITE_APP_TITLE: import.meta.env.VITE_APP_TITLE,
  },
  clientPrefix: "VITE_",
});
```

### Node.js only

```ts
import { createEnv, z } from "@tdanks2000/typesafe-env";

export const env = createEnv({
  schema: z.object({
    DATABASE_URL: z.string().url(),
    REDIS_HOST: z.string(),
    REDIS_PORT: z.coerce.number(),
  }),
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PORT: process.env.REDIS_PORT,
  },
});
```

### Custom error messages

```ts
export const env = createEnv({
  schema: z.object({
    API_KEY: z.string().min(32, "API key must be at least 32 characters"),
  }),
  runtimeEnv: {
    API_KEY: process.env.API_KEY,
  },
  onError: (error) => {
    console.error("❌ Invalid environment variables:");
    console.error(error.flatten().fieldErrors);
    process.exit(1);
  },
});
```

### Skip validation during build

Useful when env vars aren't available at build time:

```ts
export const env = createEnv({
  schema: envSchema,
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    // ... other vars
  },
  skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
});
```

## How it works

1. You define a Zod schema for your env vars
2. You explicitly map each variable from `process.env` or `import.meta.env`
3. At runtime (app startup), we validate those values against your schema
4. If validation fails, the app crashes with a helpful error message
5. If it passes, you get a type-safe object with proper types

The explicit mapping gives you full autocomplete and type checking - TypeScript will error if you forget to include a variable from your schema.

## Credits

Inspired by [@t3-oss/env-nextjs](https://github.com/t3-oss/t3-env) but framework-agnostic and with additional security features.

## License

MIT
