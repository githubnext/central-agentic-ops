#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const resolver = fileURLToPath(new URL("../../scripts/control-policy/resolve.mjs", import.meta.url));
const result = spawnSync(process.execPath, [resolver, ...process.argv.slice(2)], {
	env: process.env,
	stdio: "inherit",
});

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;