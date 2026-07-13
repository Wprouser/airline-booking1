import "dotenv/config";
// `getMigrations` isn't re-exported from the public "better-auth/db" entry point in the
// installed version (it only re-exports "@better-auth/core/db"), so this imports the compiled
// file directly by path — package "exports" restrictions only apply to bare-specifier
// resolution, not direct relative imports. This is the same helper `@better-auth/cli migrate`
// calls internally to create Better Auth's own tables (user/session/account/verification)
// against whatever adapter is configured (here: the raw pg Pool in server/auth.ts).
import { getMigrations } from "../../node_modules/better-auth/dist/db/get-migration.mjs";
import { auth } from "../auth.js";

const { runMigrations } = await getMigrations(auth.options);
await runMigrations();
console.log("Better Auth schema migration complete.");
process.exit(0);
