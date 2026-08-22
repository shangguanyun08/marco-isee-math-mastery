import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const qa = path.join(root, "tmp", "qa");
fs.mkdirSync(qa, { recursive: true });
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "marco-math-qa-"));
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const serverPort = 8766;
const debugPort = 9225;
const liveUrl = process.env.MARCO_TEST_URL || "";
const targetUrl = liveUrl || `http://127.0.0.1:${serverPort}/`;

const server = liveUrl ? null : spawn("python", ["-m", "http.server", String(serverPort), "--bind", "127.0.0.1"], {
  cwd: root,
  windowsHide: true,
  stdio: "ignore",
});
const chrome = spawn(chromePath, [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  "--hide-scrollbars",
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=${profile}`,
  "--window-size=1440,1200",
  targetUrl,
], { windowsHide: true, stdio: "ignore" });

async function waitForJson(url, timeout = 10000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch {
      // Browser or server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function waitForServer(url, timeout = 10000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Static server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function createCdp(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  const pending = new Map();
  let nextId = 1;
  const ready = new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  });
  return {
    ready,
    close: () => socket.close(),
    async send(method, params = {}) {
      await ready;
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
  };
}

async function evaluate(cdp, expression) {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function waitForApp(cdp) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const ready = await evaluate(cdp, "Boolean(window.__MARCO_MATH_TEST__ && document.querySelector('[data-action=\"start-session\"]'))");
    if (ready) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Practice app did not become ready");
}

let cdp;
try {
  await waitForServer(targetUrl);
  const pages = await waitForJson(`http://127.0.0.1:${debugPort}/json/list`);
  const page = pages.find((candidate) => candidate.type === "page");
  assert.ok(page?.webSocketDebuggerUrl, "Chrome page target not found");
  cdp = createCdp(page.webSocketDebuggerUrl);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await waitForApp(cdp);

  const first = await evaluate(cdp, `(() => {
    document.querySelector('[data-action="start-session"]').click();
    const api = window.__MARCO_MATH_TEST__;
    const state = api.getState();
    const session = state.sessions['1'];
    const source = api.sources.find((item) => item.id === session.activeIds[0]);
    const problem = api.makeProblem(source, 1);
    const wrong = ['A','B','C','D'].find((letter) => letter !== problem.answer);
    document.querySelector('[data-choice="' + wrong + '"]').click();
    return {
      feedback: document.querySelector('.instant-feedback.wrong')?.textContent || '',
      firstStem: problem.stem,
      activeCount: session.activeIds.length,
    };
  })()`);
  assert.equal(first.activeCount, 20);
  assert.match(first.feedback, /correct answer/i);
  assert.match(first.feedback, /not quite/i);

  const wrongShot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  fs.writeFileSync(path.join(qa, "wrong-feedback.png"), Buffer.from(wrongShot.data, "base64"));

  const adaptive = await evaluate(cdp, `(() => {
    const api = window.__MARCO_MATH_TEST__;
    function answerCurrentRoundWrong() {
      while (api.getState().sessions['1'].status === 'active') {
        const session = api.getState().sessions['1'];
        const id = session.activeIds[session.position];
        if (!session.answers[String(id)]) {
          const source = api.sources.find((item) => item.id === id);
          const problem = api.makeProblem(source, session.round);
          const wrong = ['A','B','C','D'].find((letter) => letter !== problem.answer);
          document.querySelector('[data-choice="' + wrong + '"]').click();
        }
        document.querySelector('[data-action="next"]').click();
      }
    }
    document.querySelector('[data-action="next"]').click();
    answerCurrentRoundWrong();
    const afterOne = api.getState().sessions['1'];
    const roundOneCount = afterOne.pendingIds.length;
    document.querySelector('[data-action="start-next-round"]').click();
    const roundTwo = api.getState().sessions['1'];
    const firstSource = api.sources.find((item) => item.id === roundTwo.activeIds[0]);
    const secondStem = api.makeProblem(firstSource, 2).stem;
    answerCurrentRoundWrong();
    document.querySelector('[data-action="start-next-round"]').click();
    answerCurrentRoundWrong();
    const final = api.getState().sessions['1'];
    return {
      roundOneCount,
      secondStem,
      status: final.status,
      historyRounds: final.history.map((entry) => entry.round),
      finalMissed: final.finalMissed.length,
      pageText: document.querySelector('#app').textContent,
    };
  })()`);
  assert.equal(adaptive.roundOneCount, 20);
  assert.notEqual(adaptive.secondStem, first.firstStem);
  assert.equal(adaptive.status, "completed");
  assert.deepEqual(adaptive.historyRounds, [1, 2, 3]);
  assert.equal(adaptive.finalMissed, 20);
  assert.match(adaptive.pageText, /Round 3 complete/);

  await evaluate(cdp, "localStorage.clear(); location.reload(); true");
  await new Promise((resolve) => setTimeout(resolve, 300));
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await cdp.send("Page.reload", { ignoreCache: true });
  await waitForApp(cdp);
  const mobileShot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  fs.writeFileSync(path.join(qa, "mobile-home.png"), Buffer.from(mobileShot.data, "base64"));

  console.log("Browser smoke test passed: wrong-answer explanation, 20-question Round 1, fresh Round 2, and Round 3 stop.");
} finally {
  cdp?.close();
  chrome.kill();
  server?.kill();
}
