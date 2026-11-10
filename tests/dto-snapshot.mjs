import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const snapshot = JSON.parse(readFileSync("docs/develop-contract.json", "utf8"));
const files = snapshot.files.filter(
  (f) =>
    f.path.includes("/dto/") ||
    /\/(ApiResponse|PageResponse|FieldErrorDetail)\.java$/.test(f.path),
);
const types = readFileSync("src/types/dto.ts", "utf8");
let checked = 0;
for (const file of files) {
  const name = file.path.split("/").pop().replace(".java", "");
  const match = types.match(
    new RegExp(
      "export interface " + name + "(?:<[^>]+>)?\\s*\\{([\\s\\S]*?)\\n\\}",
    ),
  );
  assert.ok(match, `${name}: missing frontend DTO`);
  // Lombok boolean isX fields expose JSON x via isX() getters under default Jackson naming.
  const source = file.content.replace(
    /@(NotNull|Positive|Valid)\b(?:\([^)]*\))?/g,
    "",
  );
  const fields = [
    ...source.matchAll(/private\s+([\w<>?, ]+)\s+(\w+)\s*(?:=[^;]*)?;/g),
  ]
    .map(([, type, key]) =>
      type.trim() === "boolean" && /^is[A-Z]/.test(key)
        ? key[2].toLowerCase() + key.slice(3)
        : key,
    )
    .sort();
  const local = [...match[1].matchAll(/^\s*(\w+)\??:/gm)]
    .map((m) => m[1])
    .sort();
  assert.deepEqual(
    local,
    fields,
    `${name}: property names diverge from pinned Java source`,
  );
  checked++;
}
assert.ok(checked >= 55);
console.log(
  `PASS (LEGACY demo baseline, not current REST): ${checked} DTO field sets match historical backend snapshot ${snapshot.sha}. Boolean JSON names assume default Jackson/Lombok; verify response fixtures at integration.`,
);

for (const file of snapshot.files.filter((f) => f.path.includes("/enums/"))) {
  const name = file.path.split("/").pop().replace(".java", "");
  const source = file.content.replace(/\/\/[^\n]*/g, "");
  const body = source.match(
    new RegExp("enum " + name + "\\s*\\{([\\s\\S]*?)\\}"),
  )[1];
  const javaValues = body.match(/[A-Z][A-Z_0-9]*/g).sort();
  const match = types.match(new RegExp("export type " + name + " =([^;]+);"));
  assert.ok(match, `${name}: missing enum`);
  const tsValues = match[1]
    .match(/"([A-Z_0-9]+)"/g)
    .map((v) => v.slice(1, -1))
    .sort();
  assert.deepEqual(tsValues, javaValues, `${name}: enum mismatch`);
}
console.log(
  "PASS (LEGACY demo baseline): all 13 historical backend enums match frontend",
);
