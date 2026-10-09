# Project Design System

For all design work in this project, always use the `web-design-guidelines` skill before creating or reviewing UI, visual identity, layout, UX writing, marketing pages, product screens, or design-system decisions.

Keep Plata's brand, colors, typography, voice, and layout patterns as the source of truth. Brand context lives in `brand/`.

# Product And Brand Context

Before developing product features, flows, data models, API surfaces, or user-facing behavior, read `build-plan/03-plata-finanzas-ar.md`, `specs/architecture.md`, and `specs/sdlc.md`, and keep the implementation aligned with that scope.

Before making decisions about what Plata is, who it serves, how it should feel, or how it should communicate, read `brand/03-plata.md` and `specs/architecture.md`.

Security- and privacy-sensitive work must follow `specs/threat-model.md` and `legal/pack.md` (Ley 25.326, local-first).

# Where Code Lives

## Apps

- `apps/mobile`: Expo/React Native app using Expo Router, Uniwind, and HeroUI Native. Main surface of the MVP; finance features live in `apps/mobile/src/features`.
- `apps/web`: TanStack Start/Vite React web app. Marketing and companion web surface.
- `apps/api`: Hono API with tRPC, Better Auth, and Drizzle. Optional sync/auth backend.

## Packages

- `packages/trpc`: tRPC routers, context, and business logic.
- `packages/auth`: Better Auth setup shared by server and clients.
- `packages/db`: Drizzle client, schema, and database tooling.
- `packages/ui`: Shared shadcn/Tailwind UI primitives for web.
- `packages/ts-config`: Shared TypeScript and tooling config.

# Local Commands

Use Bun for all package commands.

## Whole Project From Root

- Install dependencies: `bun install`
- Run all apps locally through Turbo: `bun run dev`
- Run only the web app: `bun run dev:web`
- Run only the API: `bun run dev:api`
- Run only the mobile app: `bun run dev:mobile`
- Check formatting and linting: `bun run check`
- Check TypeScript across the repo: `bun run check-types`
- Run unit tests: `bun run test`
- Build the repo: `bun run build`
- Regenerate env types: `bun run env:generate`

## `apps/mobile`

- Run locally with Expo: `bun run dev:mobile`
- Run finance feature tests: `cd apps/mobile && bun test src/features/transactions`

## `apps/web`

- Run locally: `bun run dev:web` (http://localhost:3001)
- Check types: `cd apps/web && bun run check-types`

## `apps/api`

- Run locally: `bun run dev:api` (http://localhost:3000)
- Check types: `cd apps/api && bun run check-types`
- Regenerate the Better Auth schema: `bun run auth:generate`

# Pull Requests

Never create a pull request unless the user explicitly asks for one.

Each PR must have one objective and one responsibility. If the PR body needs wording like "also", "and also", or introduces a second unrelated concern, split the work into separate PRs.

PR titles must use Conventional Commits format:

- `fix(native): confirm suggested transactions in one tap`
- `feat(api): add catch-up reconstruction endpoint`
- `chore(ci): bump GitHub Actions`

PR bodies should be brief and include:

- Problem: what was wrong or missing.
- Solution: how it was fixed or implemented.
- Checks: what was run and whether it passed.
- Impact: user-facing, API, data, migration, deployment, or compatibility impact.

For UI changes that add, remove, or fix visible behavior, include before/after images. If the change involves motion, animation, transitions, gestures, or interaction timing, include a short video instead of only screenshots.

# Commits

Never create a commit unless the user explicitly asks for one.

Commit messages must:

- use Conventional Commits format
- be 100 characters or fewer
- pass Lefthook hooks (format + lint via Ultracite, message via commitlint)

Examples:

- `fix(native): keep suggested transactions after reload`
- `feat(native): add one-tap confirmation flow`
- `chore(repo): adopt shared tooling config`

Stage files with intent. Do not use a blind `git add .`, and do not stage files one by one when a coherent group should be staged together. Group staged files by the responsibility of the commit.

# Ultracite Code Standards

This project uses **Ultracite**, a zero-config preset that enforces strict code quality standards through automated formatting and linting.

## Quick Reference

- **Format code**: `bun x ultracite fix`
- **Check for issues**: `bun x ultracite check`
- **Diagnose setup**: `bun x ultracite doctor`

Biome (the underlying engine) provides robust linting and formatting. Most issues are automatically fixable.

---

## Core Principles

Write code that is **accessible, performant, type-safe, and maintainable**. Focus on clarity and explicit intent over brevity.

### Type Safety & Explicitness

- Use explicit types for function parameters and return values when they enhance clarity
- Prefer `unknown` over `any` when the type is genuinely unknown
- Use const assertions (`as const`) for immutable values and literal types
- Leverage TypeScript's type narrowing instead of type assertions
- Use meaningful variable names instead of magic numbers - extract constants with descriptive names

### Modern JavaScript/TypeScript

- Use arrow functions for callbacks and short functions
- Prefer `for...of` loops over `.forEach()` and indexed `for` loops
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access
- Prefer template literals over string concatenation
- Use destructuring for object and array assignments
- Use `const` by default, `let` only when reassignment is needed, never `var`

### Async & Promises

- Always `await` promises in async functions - don't forget to use the return value
- Use `async/await` syntax instead of promise chains for better readability
- Handle errors appropriately in async code with try-catch blocks
- Don't use async functions as Promise executors

### React & JSX

- Use function components over class components
- Call hooks at the top level only, never conditionally
- Specify all dependencies in hook dependency arrays correctly
- Use the `key` prop for elements in iterables (prefer unique IDs over array indices)
- Nest children between opening and closing tags instead of passing as props
- Don't define components inside other components
- Use semantic HTML and ARIA attributes for accessibility:
  - Provide meaningful alt text for images
  - Use proper heading hierarchy
  - Add labels for form inputs
  - Include keyboard event handlers alongside mouse events
  - Use semantic elements (`<button>`, `<nav>`, etc.) instead of divs with roles

### Error Handling & Debugging

- Remove `console.log`, `debugger`, and `alert` statements from production code
- Throw `Error` objects with descriptive messages, not strings or other values
- Use `try-catch` blocks meaningfully - don't catch errors just to rethrow them
- Prefer early returns over nested conditionals for error cases

### Code Organization

- Keep functions focused and under reasonable cognitive complexity limits
- Extract complex conditions into well-named boolean variables
- Use early returns to reduce nesting
- Prefer simple conditionals over nested ternary operators
- Group related code together and separate concerns

### Security

- Add `rel="noopener"` when using `target="_blank"` on links
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary
- Don't use `eval()` or assign directly to `document.cookie`
- Validate and sanitize user input

### Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regex literals instead of creating them in loops
- Prefer specific imports over namespace imports
- Avoid barrel files (index files that re-export everything)
- Use proper image components (e.g., Next.js `<Image>`) over `<img>` tags

### Framework-Specific Guidance

**Next.js:**

- Use Next.js `<Image>` component for images
- Use `next/head` or App Router metadata API for head elements
- Use Server Components for async data fetching instead of async Client Components

**React 19+:**

- Use ref as a prop instead of `React.forwardRef`

**Solid/Svelte/Vue/Qwik:**

- Use `class` and `for` attributes (not `className` or `htmlFor`)

---

## Testing

- Write assertions inside `it()` or `test()` blocks
- Avoid done callbacks in async tests - use async/await instead
- Don't use `.only` or `.skip` in committed code
- Keep test suites reasonably flat - avoid excessive `describe` nesting

## When Biome Can't Help

Biome's linter will catch most issues automatically. Focus your attention on:

1. **Business logic correctness** - Biome can't validate your algorithms
2. **Meaningful naming** - Use descriptive names for functions, variables, and types
3. **Architecture decisions** - Component structure, data flow, and API design
4. **Edge cases** - Handle boundary conditions and error states
5. **User experience** - Accessibility, performance, and usability considerations
6. **Documentation** - Add comments for complex logic, but prefer self-documenting code

---

Most formatting and common issues are automatically fixed by Biome. Run `bun x ultracite fix` before committing to ensure compliance.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
