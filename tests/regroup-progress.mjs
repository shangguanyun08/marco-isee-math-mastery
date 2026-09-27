import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const source = fs.readFileSync(new URL("sources.js", root), "utf8");
const script = fs.readFileSync(new URL("app.js", root), "utf8");
const blank = () => ({ status: "not-started", round: 0, activeIds: [], pendingIds: [],
  position: 0, answers: {}, history: [], mastered: false, finalMissed: [], updatedAt: null });
const oldState = () => ({ version: 1, view: "practice", selectedSession: 7,
  sessions: Object.fromEntries(Array.from({ length: 7 }, (_, i) => [i + 1, blank()])) });
const ids6 = Array.from({ length: 20 }, (_, i) => 101 + i);

function load(saved) {
  let click;
  const node = { innerHTML: "", textContent: "", hidden: false, scrollIntoView() {} };
  const context = { localStorage: { getItem: () => JSON.stringify(saved), setItem() {} },
    document: { querySelector: () => node, querySelectorAll: () => [],
      addEventListener: (name, handler) => { if (name === "click") click = handler; } },
    scrollTo() {} };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(source, context);
  vm.runInContext(script, context);
  return { api: context.__MARCO_MATH_TEST__,
    click: (dataset) => click({ target: { closest: () => ({ dataset }) } }) };
}

const initial = oldState();
initial.sessions[1] = { ...blank(), status: "active", round: 1, activeIds: [1, 2],
  answers: { 1: { choice: "B", correct: true } } };
const migrated = load(initial).api.getState();
assert.equal(migrated.selectedSession, 6);
assert.equal(Object.keys(migrated.sessions).length, 6);
assert.equal(JSON.stringify(migrated.sessions[1]), JSON.stringify(initial.sessions[1]));
assert.equal(migrated.sessions[6].status, "not-started");

const partial = oldState();
partial.sessions[6] = { ...blank(), status: "active", round: 1, activeIds: ids6,
  answers: Object.fromEntries(ids6.slice(0, 10).map((id) => [id, { choice: "A", correct: false }])) };
partial.sessions[7] = { ...blank(), status: "active", round: 1, activeIds: [121, 122, 123],
  answers: { 121: { choice: "B", correct: true } } };
const resumed = load(partial).api.getState().sessions[6];
assert.equal(resumed.activeIds.length, 23);
assert.equal(resumed.position, 10);
assert.equal(Object.keys(resumed.answers).length, 11);

const mixed = oldState();
mixed.sessions[6] = { ...blank(), status: "completed", round: 3,
  activeIds: [101], answers: { 101: { choice: "A", correct: false } }, finalMissed: [101],
  history: [1, 2, 3].map((round) => ({ round, total: round === 1 ? 20 : 1,
    correct: round === 1 ? 19 : 0, wrongIds: [101], finishedAt: "2026-09-26T00:00:00Z" })) };
mixed.sessions[7] = { ...blank(), status: "active", round: 1, activeIds: [121, 122, 123],
  answers: { 121: { choice: "A", correct: false } } };
const harness = load(mixed);
const current = () => harness.api.getState().sessions[6];
assert.equal(current().position, 21);
function answerCorrectAndAdvance() {
  const session = current();
  const id = session.activeIds[session.position];
  const question = harness.api.makeProblem(harness.api.sources.find((item) => item.id === id), session.round);
  harness.click({ choice: question.answer });
  harness.click({ action: "next" });
}
answerCorrectAndAdvance();
answerCorrectAndAdvance();
assert.equal(current().status, "between");
assert.equal(current().pendingIds.join(), "101,121");
harness.click({ action: "start-next-round" });
assert.equal(current().position, 1);
answerCorrectAndAdvance();
assert.equal(current().pendingIds.join(), "101");
harness.click({ action: "start-next-round" });
assert.equal(current().status, "completed");
assert.equal(current().finalMissed.join(), "101");
assert.equal(current().history.length, 3);
assert.equal(current().history[0].total, 23);
assert.equal(current().history[1].correct, 1);
assert.equal(current().history[2].correct, 0);
const done = harness.api.getState();
assert.equal(harness.api.regroupProgress(done), done, "Regrouping must be idempotent");
assert.equal(JSON.stringify(done.previousGrouping.session6), JSON.stringify(mixed.sessions[6]));
console.log("Saved progress migration passed: untouched, partial, and mixed-round sessions; 23-question final session; three-round stop.");
