import assert from "node:assert/strict";
import test from "node:test";
import { actionsLog } from "../../activity/actions-log.mjs";
import { actionsLog as controlActionsLog } from "../../.github/cao/src/actions-log.mjs";

function verifyActionsLog(log) {
  const output = [];
  const originalLog = console.log;
  console.log = (line) => output.push(line);
  try {
    log.info`Collected ${3} records`;
    log.warning`partial%coverage
retry`;
    log.group`Build ${"dashboard"}`;
    log.endGroup();
  } finally {
    console.log = originalLog;
  }

  assert.deepEqual(output, [
    "Collected 3 records",
    "::warning::partial%25coverage%0Aretry",
    "::group::Build dashboard",
    "::endgroup::",
  ]);
}

test("Actions log macros format messages and workflow commands", () => {
  verifyActionsLog(actionsLog);
});

test("CAO runtime Actions log macros format messages and workflow commands", () => {
  verifyActionsLog(controlActionsLog);
});
