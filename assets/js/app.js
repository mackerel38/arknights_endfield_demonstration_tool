const REWARDS = [0, 1000, 2000, 4000, 7500, 12000, 20000, 36000, 60000, 100000, 160000];
const POWER = [1, 2, 3, 4, 5];
const MAX_DRAW = 5;
const KEY_FIELD_BITS = 16n;
const KEY_FIELD_BASE = 1n << KEY_FIELD_BITS;
const MAX_KEY_FIELD_VALUE = Number(KEY_FIELD_BASE - 1n);
const valueMemo = new Map();
let autoCalculateEnabled = true;
let currentLang = localStorage.getItem("language") === "en" ? "en" : "ja";

const I18N = {
  ja: {
    htmlLang: "ja",
    translationWarning: "",
    pageTitle: "選剣演武 期待値計算ツール",
    lead: "現在の盤面から各ボタンを押した場合の、残り挑戦回数を使い切るまでの最大期待報酬を計算します。",
    inputTitle: "盤面入力",
    attempts: "残り挑戦回数（現在の回数を含む）",
    freeDiscards: "残り破棄回数",
    doubleUses: "残り報酬2倍回数",
    doubleActive: "現在、報酬2倍がON",
    doubleActiveHint: "ONとして演算開始を評価",
    deckCounts: "山札の残り枚数",
    power1: "戦力1",
    power2: "戦力2",
    power3: "戦力3",
    power4: "戦力4",
    power5: "戦力5",
    deckHint: "ここは、現在の挑戦で既に引いたカードを除いた山札枚数として入力します。",
    drawActionsLabel: "引いたカードを反映",
    drewPower: "戦力{power}を引いた",
    drawnBreakdown: "精密入力: 現在引いたカードの内訳",
    drawnPower1: "引いた戦力1",
    drawnPower2: "引いた戦力2",
    drawnPower3: "引いた戦力3",
    drawnPower4: "引いた戦力4",
    drawnPower5: "引いた戦力5",
    calculate: "計算する",
    autoOn: "自動計算: ON",
    autoOff: "自動計算: OFF",
    clear: "クリア",
    resultTitle: "各ボタンの期待値",
    complexityTitle: "計算量",
    complexityText: "このツールは、動的計画法を用いてできるだけ高速化していますが、結構重いです（；；）改善できる方はご連絡ください！",
    otherTools: "その他のツール",
    essenceTool: "基質厳選ツール",
    pending: "入力を変更しました。必要なら「計算する」を押してください。",
    engineWasm: "C++/WebAssembly",
    engineJs: "JavaScript",
    engineLoading: "JavaScript（WASM読込中）",
    engineFailed: "JavaScript（WASM読込失敗）",
    engineNotStarted: "JavaScript（WASM未読込）",
    errorNumber: "数値として読めない入力があります。",
    errorCount: "回数は0以上の整数で入力してください。",
    errorLimit: "回数と山札の枚数は{limit}以下で入力してください。",
    errorBaseLimit: "挑戦開始時の山札枚数は各戦力{limit}枚以下にしてください。",
    errorDeck: "山札の残り枚数は0以上の整数で入力してください。",
    errorDrawnMax: "現在引いている枚数は5枚以下です。",
    errorDoubleActive: "報酬2倍ONの盤面では、残り報酬2倍回数が1以上必要です。",
    errorDrawn: "現在引いたカードの内訳は0以上の整数で入力してください。",
    statusCurrent: "現在状態: {drawnCount}枚 / 合計戦力 {total} / スコア {score} / {doubleText}",
    statusBest: "最適継続期待値: {value}",
    statusEngine: "計算エンジン: {engine}",
    doubleOn: "報酬2倍ON",
    doubleOff: "報酬2倍OFF",
    actionDraw: "カードを引く",
    actionDiscard: "破棄",
    actionDoubleOn: "報酬2倍をON",
    actionDoubleOff: "報酬2倍をOFF",
    actionSettle: "演算開始",
    descDraw: "1枚引いた後、以降は最善手を選ぶ場合の期待値です。",
    descDiscard: "この挑戦をリセットした後、以降は最善手を選ぶ場合の期待値です。",
    descDouble: "報酬2倍を切り替えた後、以降は最善手を選ぶ場合の期待値です。",
    descSettle: "現在のスコアで報酬を確定し、次の挑戦以降は最善手を選ぶ場合の期待値です。",
    invalidDraw: "5枚上限、または山札切れのため使用できません。",
    invalidDiscard: "使用できません。",
    invalidDouble: "3枚目を引いた後、または残り回数0のため切り替えできません。",
    invalidSettle: "残り挑戦回数が0、または報酬2倍ONで残り回数0のため使用できません。",
    bestBadge: "最善",
    invalidValue: "不可",
    errorAlreadyFive: "既に5枚引いているため、これ以上反映できません。",
    errorNoCard: "戦力{power}の山札残り枚数がありません。"
  },
  en: {
    htmlLang: "en",
    translationWarning: "The translation may be inaccurate.",
    pageTitle: "Trial of Swordmancy Expected Value Calculator",
    lead: "Calculates the maximum expected reward from the current board for each available action until all remaining Trial of Swordmancy attempts are used.",
    inputTitle: "Board Input",
    attempts: "Remaining Rewarded Trial attempts (including the current trial)",
    freeDiscards: "Remaining discards",
    doubleUses: "Remaining double-reward uses",
    doubleActive: "Double reward is currently ON",
    doubleActiveHint: "Evaluate Start Calculation with double reward ON",
    deckCounts: "Remaining deck cards",
    power1: "Power 1",
    power2: "Power 2",
    power3: "Power 3",
    power4: "Power 4",
    power5: "Power 5",
    deckHint: "Enter the remaining deck after excluding cards already drawn in the current trial.",
    drawActionsLabel: "Apply drawn card",
    drewPower: "Drew Power {power}",
    drawnBreakdown: "Precise Input: Cards Drawn This Trial",
    drawnPower1: "Drawn Power 1",
    drawnPower2: "Drawn Power 2",
    drawnPower3: "Drawn Power 3",
    drawnPower4: "Drawn Power 4",
    drawnPower5: "Drawn Power 5",
    calculate: "Calculate",
    autoOn: "Auto Calculate: ON",
    autoOff: "Auto Calculate: OFF",
    clear: "Clear",
    resultTitle: "Expected Value by Action",
    complexityTitle: "Runtime",
    complexityText: "This tool uses dynamic programming to run as fast as possible, but it can still be fairly heavy. Please contact me if you can improve it!",
    otherTools: "Other Tools",
    essenceTool: "Essence Selection Tool",
    pending: "Input changed. Press Calculate when needed.",
    engineWasm: "C++/WebAssembly",
    engineJs: "JavaScript",
    engineLoading: "JavaScript (loading WASM)",
    engineFailed: "JavaScript (WASM load failed)",
    engineNotStarted: "JavaScript (WASM not loaded)",
    errorNumber: "Some inputs could not be read as numbers.",
    errorCount: "Counts must be non-negative integers.",
    errorLimit: "Trial counts and deck counts must be {limit} or less.",
    errorBaseLimit: "Starting deck count for each power must be {limit} or less.",
    errorDeck: "Remaining deck cards must be non-negative integers.",
    errorDrawnMax: "You can draw at most 5 cards.",
    errorDoubleActive: "If double reward is ON, remaining double reward uses must be at least 1.",
    errorDrawn: "Drawn card counts must be non-negative integers.",
    statusCurrent: "Current: {drawnCount} cards / Total Power {total} / Score {score} / {doubleText}",
    statusBest: "Best continuation expected value: {value}",
    statusEngine: "Engine: {engine}",
    doubleOn: "Double reward ON",
    doubleOff: "Double reward OFF",
    actionDraw: "Draw Card",
    actionDiscard: "Discard",
    actionDoubleOn: "Turn Double Reward ON",
    actionDoubleOff: "Turn Double Reward OFF",
    actionSettle: "Start Calculation",
    descDraw: "Expected value after drawing one card, then playing optimally afterward.",
    descDiscard: "Expected value after resetting this trial, then playing optimally afterward.",
    descDouble: "Expected value after toggling double reward, then playing optimally afterward.",
    descSettle: "Expected value after locking in the current score reward, then playing optimally from the next trial.",
    invalidDraw: "Unavailable because you already have 5 cards or the deck is empty.",
    invalidDiscard: "Unavailable.",
    invalidDouble: "Unavailable after the third draw or when no double reward uses remain.",
    invalidSettle: "Unavailable when no trial attempts remain, or when double reward is ON with no uses remaining.",
    bestBadge: "Best",
    invalidValue: "N/A",
    errorAlreadyFive: "You have already drawn 5 cards.",
    errorNoCard: "No Power {power} cards remain in the deck."
  }
};

const ids = [
  "attempts", "freeDiscards", "doubleUses",
  "count1", "count2", "count3", "count4", "count5",
  "drawn1", "drawn2", "drawn3", "drawn4", "drawn5"
];

function byId(id) {
  return document.getElementById(id);
}

function t(key, params = {}) {
  let text = I18N[currentLang][key] ?? I18N.ja[key] ?? key;
  for (const [name, value] of Object.entries(params)) {
    text = text.replaceAll(`{${name}}`, String(value));
  }
  return text;
}

function applyLanguage() {
  document.documentElement.lang = t("htmlLang");
  document.title = t("pageTitle");
  const translationWarning = byId("translationWarning");
  translationWarning.hidden = currentLang !== "en";
  document.querySelectorAll("[data-i18n]").forEach(element => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelector(".draw-actions")?.setAttribute("aria-label", t("drawActionsLabel"));
  document.querySelectorAll(".draw-card").forEach(button => {
    button.textContent = t("drewPower", { power: button.dataset.power });
  });
  document.querySelectorAll("[data-lang]").forEach(button => {
    const active = button.dataset.lang === currentLang;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  updateAutoCalculateButton();
}

function readInt(id, fallback = 0) {
  const raw = byId(id).value.trim();
  if (raw === "") return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? Math.trunc(value) : NaN;
}

function readInputs() {
  const currentCounts = POWER.map((_, i) => readInt(`count${i + 1}`));
  const drawnDetail = POWER.map((_, i) => readInt(`drawn${i + 1}`, 0));
  return {
    attempts: readInt("attempts"),
    freeDiscards: readInt("freeDiscards"),
    doubleUses: readInt("doubleUses"),
    drawnCount: sum(drawnDetail),
    currentTotal: weightedSum(drawnDetail),
    currentCounts,
    doubleActive: byId("doubleActive").checked,
    drawnDetail
  };
}

function sum(arr) {
  return arr.reduce((a, b) => a + b, 0);
}

function weightedSum(arr) {
  return arr.reduce((acc, value, index) => acc + value * POWER[index], 0);
}

function addVec(a, b) {
  return a.map((v, i) => v + b[i]);
}

function addOne(arr, index) {
  const next = arr.slice();
  next[index] += 1;
  return next;
}

function nonNegativeInts(values) {
  return values.every(v => Number.isInteger(v) && v >= 0);
}

function packableInts(values) {
  return values.every(v => Number.isInteger(v) && v >= 0 && v <= MAX_KEY_FIELD_VALUE);
}

function appendKeyField(key, value) {
  return key * KEY_FIELD_BASE + BigInt(value);
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return "-";
  return value.toLocaleString(currentLang === "en" ? "en-US" : "ja-JP", { maximumFractionDigits: 2 });
}

function setPendingMessage() {
  byId("status").innerHTML = `<div class="notice">${t("pending")}</div>`;
}

function engineLabel(values) {
  if (values && values.engine === "wasm") return t("engineWasm");
  if (window.SolverWasm) {
    const status = window.SolverWasm.getStatus();
    if (status === "loading") return t("engineLoading");
    if (status === "failed") return t("engineFailed");
    if (status === "not-started") return t("engineNotStarted");
  }
  return t("engineJs");
}

function runAutoCalculate() {
  if (autoCalculateEnabled) {
    calculate();
  } else {
    setPendingMessage();
  }
}

function updateAutoCalculateButton() {
  const button = byId("autoCalculate");
  button.textContent = autoCalculateEnabled ? t("autoOn") : t("autoOff");
  button.setAttribute("aria-pressed", String(autoCalculateEnabled));
  button.classList.toggle("is-off", !autoCalculateEnabled);
}

function validateInputs(input) {
  const errors = [];
  const allNumbers = [
    input.attempts, input.freeDiscards, input.doubleUses,
    ...input.currentCounts, ...input.drawnDetail
  ];
  if (allNumbers.some(v => Number.isNaN(v))) errors.push(t("errorNumber"));
  if (!nonNegativeInts([input.attempts, input.freeDiscards, input.doubleUses])) {
    errors.push(t("errorCount"));
  }
  if (!packableInts([input.attempts, input.freeDiscards, input.doubleUses, ...input.currentCounts])) {
    errors.push(t("errorLimit", { limit: MAX_KEY_FIELD_VALUE }));
  }
  if (!input.currentCounts.every((count, i) => count + input.drawnDetail[i] <= MAX_KEY_FIELD_VALUE)) {
    errors.push(t("errorBaseLimit", { limit: MAX_KEY_FIELD_VALUE }));
  }
  if (!nonNegativeInts(input.currentCounts)) errors.push(t("errorDeck"));
  if (input.drawnCount > MAX_DRAW) errors.push(t("errorDrawnMax"));
  if (input.doubleActive && input.doubleUses <= 0) {
    errors.push(t("errorDoubleActive"));
  }
  if (!nonNegativeInts(input.drawnDetail)) errors.push(t("errorDrawn"));
  return errors;
}

function makeSolver() {
  const memo = valueMemo;

  function keyOf(state) {
    let key = 0n;
    key = appendKeyField(key, state.attempts);
    key = appendKeyField(key, state.freeDiscards);
    key = appendKeyField(key, state.doubleUses);
    key = key * 2n + (state.doubleActive ? 1n : 0n);
    key = appendKeyField(key, state.total);
    for (const count of state.drawn) {
      key = appendKeyField(key, count);
    }
    for (const count of state.base) {
      key = appendKeyField(key, count);
    }
    return key;
  }

  function currentDeck(state) {
    return state.base.map((v, i) => v - state.drawn[i]);
  }

  function settleValue(state) {
    if (state.attempts <= 0) return -Infinity;
    if (state.doubleActive && state.doubleUses <= 0) return -Infinity;
    const deck = currentDeck(state);
    const multiplier = state.doubleActive ? 2 : 1;
    const gained = REWARDS[((state.total % 11) + 11) % 11] * multiplier;
    const nextState = {
      attempts: state.attempts - 1,
      freeDiscards: state.freeDiscards,
      doubleUses: state.doubleUses - (state.doubleActive ? 1 : 0),
      doubleActive: false,
      base: deck,
      drawn: [0, 0, 0, 0, 0],
      total: 0
    };
    return gained + bestValue(nextState);
  }

  function discardValue(state) {
    if (state.freeDiscards > 0) {
      return bestValue({
        ...state,
        freeDiscards: state.freeDiscards - 1,
        doubleActive: false,
        drawn: [0, 0, 0, 0, 0],
        total: 0
      });
    }
    if (state.attempts <= 0) return -Infinity;
    return bestValue({
      ...state,
      attempts: state.attempts - 1,
      doubleActive: false,
      drawn: [0, 0, 0, 0, 0],
      total: 0
    });
  }

  function drawValue(state) {
    const drawnCount = sum(state.drawn);
    if (drawnCount >= MAX_DRAW) return -Infinity;
    const deck = currentDeck(state);
    const deckTotal = sum(deck);
    if (deckTotal <= 0) return -Infinity;
    let expected = 0;
    for (let i = 0; i < deck.length; i += 1) {
      if (deck[i] <= 0) continue;
      const nextState = {
        ...state,
        drawn: addOne(state.drawn, i),
        total: state.total + POWER[i]
      };
      expected += (deck[i] / deckTotal) * bestValue(nextState);
    }
    return expected;
  }

  function coreValue(state) {
    return Math.max(drawValue(state), discardValue(state), settleValue(state));
  }

  function canToggleDouble(state) {
    const drawnCount = sum(state.drawn);
    if (drawnCount > 2) return false;
    if (!state.doubleActive && state.doubleUses <= 0) return false;
    return true;
  }

  function bestValue(state) {
    if (state.attempts <= 0) return 0;
    const key = keyOf(state);
    if (memo.has(key)) return memo.get(key);

    const core = coreValue(state);
    let value = core;
    if (canToggleDouble(state)) {
      const toggled = { ...state, doubleActive: !state.doubleActive };
      value = Math.max(value, coreValue(toggled));
    }
    if (!Number.isFinite(value)) value = 0;
    memo.set(key, value);
    return value;
  }

  function actionValues(state) {
    const toggleAllowed = canToggleDouble(state);
    return {
      draw: drawValue(state),
      discard: discardValue(state),
      double: toggleAllowed ? bestValue({ ...state, doubleActive: !state.doubleActive }) : -Infinity,
      settle: settleValue(state),
      best: bestValue(state)
    };
  }

  return { bestValue, actionValues };
}

function summarizeScenarios(values) {
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) return { value: -Infinity, min: -Infinity, max: -Infinity };
  const value = finite.reduce((a, b) => a + b, 0) / finite.length;
  return {
    value,
    min: Math.min(...finite),
    max: Math.max(...finite)
  };
}

function calculate() {
  const input = readInputs();
  const status = byId("status");
  const results = byId("results");
  status.innerHTML = "";
  results.innerHTML = "";

  const errors = validateInputs(input);
  if (errors.length > 0) {
    status.innerHTML = errors.map(error => `<div class="notice error">${error}</div>`).join("");
    return;
  }

  const actionKeys = ["draw", "discard", "double", "settle"];
  let values = null;
  if (window.SolverWasm && window.SolverWasm.isReady()) {
    values = window.SolverWasm.solve(input);
    if (values) values.engine = "wasm";
  }
  if (!values) {
    const solver = makeSolver();
    const initialState = {
      attempts: input.attempts,
      freeDiscards: input.freeDiscards,
      doubleUses: input.doubleUses,
      doubleActive: input.doubleActive,
      base: addVec(input.currentCounts, input.drawnDetail),
      drawn: input.drawnDetail,
      total: input.currentTotal
    };
    values = solver.actionValues(initialState);
    values.engine = "js";
  }
  const summaries = Object.fromEntries(actionKeys.map(key => [key, summarizeScenarios([values[key]])]));
  const bestImmediate = Math.max(...actionKeys.map(key => summaries[key].value).filter(Number.isFinite));
  const overall = summarizeScenarios([values.best]);
  const doubleText = input.doubleActive ? t("doubleOn") : t("doubleOff");
  status.innerHTML = `
    <div><strong>${t("statusCurrent", {
      drawnCount: input.drawnCount,
      total: input.currentTotal,
      score: input.currentTotal % 11,
      doubleText
    })}</strong></div>
    <div><strong>${t("statusBest", { value: formatNumber(overall.value) })}</strong></div>
    <div><strong>${t("statusEngine", { engine: engineLabel(values) })}</strong></div>
  `;

  const labels = {
    draw: t("actionDraw"),
    discard: t("actionDiscard"),
    double: input.doubleActive ? t("actionDoubleOff") : t("actionDoubleOn"),
    settle: t("actionSettle")
  };
  const descriptions = {
    draw: t("descDraw"),
    discard: t("descDiscard"),
    double: t("descDouble"),
    settle: t("descSettle")
  };

  const invalidText = {
    draw: t("invalidDraw"),
    discard: t("invalidDiscard"),
    double: t("invalidDouble"),
    settle: t("invalidSettle")
  };

  results.innerHTML = actionKeys.map(key => {
    const item = summaries[key];
    const valid = Number.isFinite(item.value);
    const isBest = valid && Math.abs(item.value - bestImmediate) < 1e-7;
    return `
      <article class="result ${isBest ? "best" : ""} ${valid ? "" : "invalid"}">
        <div class="result-head">
          <div class="action-name">${labels[key]}</div>
          ${isBest ? `<div class="badge">${t("bestBadge")}</div>` : ""}
        </div>
        <div class="value">${valid ? formatNumber(item.value) : t("invalidValue")}</div>
        <div class="detail">${valid ? descriptions[key] : invalidText[key]}</div>
      </article>
    `;
  }).join("");
}

document.querySelectorAll(".draw-card").forEach(button => {
  button.addEventListener("click", () => {
    const power = Number(button.dataset.power);
    const countInput = byId(`count${power}`);
    const drawnInput = byId(`drawn${power}`);
    const currentCount = readInt(`count${power}`, 0);
    const input = readInputs();
    if (input.drawnCount >= MAX_DRAW) {
      byId("status").innerHTML = `<div class="notice error">${t("errorAlreadyFive")}</div>`;
      return;
    }
    if (currentCount <= 0) {
      byId("status").innerHTML = `<div class="notice error">${t("errorNoCard", { power })}</div>`;
      return;
    }
    countInput.value = currentCount - 1;
    drawnInput.value = readInt(`drawn${power}`, 0) + 1;
    runAutoCalculate();
  });
});

byId("calculate").addEventListener("click", calculate);

document.querySelectorAll("[data-lang]").forEach(button => {
  button.addEventListener("click", () => {
    currentLang = button.dataset.lang === "en" ? "en" : "ja";
    localStorage.setItem("language", currentLang);
    applyLanguage();
    calculate();
  });
});

byId("autoCalculate").addEventListener("click", () => {
  autoCalculateEnabled = !autoCalculateEnabled;
  updateAutoCalculateButton();
  if (autoCalculateEnabled) {
    calculate();
  } else {
    setPendingMessage();
  }
});

byId("clear").addEventListener("click", () => {
  ids.forEach(id => {
    byId(id).value = "";
  });
  byId("doubleActive").checked = false;
  runAutoCalculate();
});

document.querySelectorAll("input").forEach(input => {
  input.addEventListener("change", runAutoCalculate);
});

applyLanguage();
calculate();

if (window.SolverWasm) {
  window.SolverWasm.load().then(loaded => {
    if (loaded && autoCalculateEnabled) calculate();
  });
}
