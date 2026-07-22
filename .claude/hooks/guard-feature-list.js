#!/usr/bin/env node
// PreToolUse hook (Edit|Write). Advisory only — never blocks (always exits 0),
// because we can't reliably tell "the orchestrator command is doing this on
// purpose" from "someone is hand-editing the backlog", so a hard block would
// risk false positives worse than a reminder.
let input = "";
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  try {
    const data = JSON.parse(input || "{}");
    const filePath = data?.tool_input?.file_path || "";
    if (filePath.replace(/\\/g, "/").endsWith("feature_list.json")) {
      process.stderr.write(
        "Recordatorio: prefiere /feature:new o /feature:start para modificar feature_list.json, " +
          "asi las transiciones de estado (backlog/in-progress/done) se mantienen consistentes.\n"
      );
    }
  } catch {
    // input no parseable: no-op, nunca bloquear por esto
  }
  process.exit(0);
});
