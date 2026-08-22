import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const project = new URL("../", import.meta.url);
const nodes = new Map([
  ["#app", { innerHTML: "" }],
  ["#session-picker", { innerHTML: "" }],
  ["#announcement", { textContent: "", hidden: true }],
]);
const navButtons = ["practice", "progress"].map((view) => ({
  dataset: { view },
  classList: { toggle() {} },
}));
const storage = new Map();
const context = {
  console,
  Date,
  JSON,
  Math,
  Map,
  Set,
  localStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  },
  document: {
    querySelector: (selector) => nodes.get(selector),
    querySelectorAll: (selector) => selector === "[data-view]" ? navButtons : [],
    addEventListener() {},
  },
  confirm: () => false,
  scrollTo() {},
};
context.window = context;
vm.createContext(context);

vm.runInContext(fs.readFileSync(new URL("sources.js", project), "utf8"), context);
vm.runInContext(fs.readFileSync(new URL("app.js", project), "utf8"), context);

const api = context.__MARCO_MATH_TEST__;
assert.equal(api.sources.length, 123, "expected every verified QR/MA miss");
assert.equal(api.sources.filter((item) => item.subject === "QR").length, 57);
assert.equal(api.sources.filter((item) => item.subject === "MA").length, 66);
assert.deepEqual(Array.from(api.sessions, (session) => session.ids.length), [20, 20, 20, 20, 20, 20, 3]);

for (const source of api.sources) {
  const variants = [1, 2, 3].map((round) => api.makeProblem(source, round));
  for (const problem of variants) {
    assert.ok(problem.stem.length > 8, `missing stem for source ${source.id}`);
    assert.equal(problem.choices.length, 4, `choice count for source ${source.id}`);
    assert.equal(new Set(problem.choices).size, 4, `duplicate choices for source ${source.id}`);
    assert.ok(["A", "B", "C", "D"].includes(problem.answer), `bad key for source ${source.id}`);
    assert.ok(problem.explanation.length > 10, `missing explanation for source ${source.id}`);
  }
  assert.equal(new Set(variants.map((problem) => problem.stem)).size, 3, `round variants repeat for source ${source.id}`);
  assert.equal(new Set(variants.map((problem) => problem.answer)).size, 3, `answer positions repeat for source ${source.id}`);
}

assert.match(nodes.get("#app").innerHTML, /Practice the skill, not the screenshot/);
console.log("Validated 123 sources, 369 round variants, and 20-question session grouping.");
