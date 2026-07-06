const REWARDS = [0, 1000, 2000, 4000, 7500, 12000, 20000, 36000, 60000, 100000, 160000];
const POWER = [1, 2, 3, 4, 5];
const MAX_DRAW = 5;
const valueMemo = new Map();

const ids = [
  "attempts", "freeDiscards", "doubleUses",
  "count1", "count2", "count3", "count4", "count5",
  "drawn1", "drawn2", "drawn3", "drawn4", "drawn5"
];

function byId(id) {
  return document.getElementById(id);
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

function formatNumber(value) {
  if (!Number.isFinite(value)) return "-";
  return value.toLocaleString("ja-JP", { maximumFractionDigits: 2 });
}

function validateInputs(input) {
  const errors = [];
  const allNumbers = [
    input.attempts, input.freeDiscards, input.doubleUses,
    ...input.currentCounts, ...input.drawnDetail
  ];
  if (allNumbers.some(v => Number.isNaN(v))) errors.push("数値として読めない入力があります。");
  if (!nonNegativeInts([input.attempts, input.freeDiscards, input.doubleUses])) {
    errors.push("回数は0以上の整数で入力してください。");
  }
  if (!nonNegativeInts(input.currentCounts)) errors.push("山札の残り枚数は0以上の整数で入力してください。");
  if (input.drawnCount > MAX_DRAW) errors.push("現在引いている枚数は5枚以下です。");
  if (input.doubleActive && input.doubleUses <= 0) {
    errors.push("報酬2倍ONの盤面では、残り報酬2倍回数が1以上必要です。");
  }
  if (!nonNegativeInts(input.drawnDetail)) errors.push("現在引いたカードの内訳は0以上の整数で入力してください。");
  return errors;
}

function makeSolver() {
  const memo = valueMemo;

  function keyOf(state) {
    return [
      state.attempts,
      state.freeDiscards,
      state.doubleUses,
      state.doubleActive ? 1 : 0,
      state.total,
      state.drawn.join(","),
      state.base.join(",")
    ].join("|");
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
  const values = solver.actionValues(initialState);
  const summaries = Object.fromEntries(actionKeys.map(key => [key, summarizeScenarios([values[key]])]));
  const bestImmediate = Math.max(...actionKeys.map(key => summaries[key].value).filter(Number.isFinite));
  const overall = summarizeScenarios([values.best]);
  const doubleText = input.doubleActive ? "報酬2倍ON" : "報酬2倍OFF";
  status.innerHTML = `
    <div><strong>現在状態:</strong> ${input.drawnCount}枚 / 合計戦力 ${input.currentTotal} / スコア ${input.currentTotal % 11} / ${doubleText}</div>
    <div><strong>最適継続期待値:</strong> ${formatNumber(overall.value)}</div>
  `;

  const labels = {
    draw: "カードを引く",
    discard: "破棄",
    double: input.doubleActive ? "報酬2倍をOFF" : "報酬2倍をON",
    settle: "演算開始"
  };
  const descriptions = {
    draw: "1枚引いた後、以降は最善手を選ぶ場合の期待値です。",
    discard: "この挑戦をリセットした後、以降は最善手を選ぶ場合の期待値です。",
    double: "報酬2倍を切り替えた後、以降は最善手を選ぶ場合の期待値です。",
    settle: "現在のスコアで報酬を確定し、次の挑戦以降は最善手を選ぶ場合の期待値です。"
  };

  const invalidText = {
    draw: "5枚上限、または山札切れのため使用できません。",
    discard: "使用できません。",
    double: "3枚目を引いた後、または残り回数0のため切り替えできません。",
    settle: "残り挑戦回数が0、または報酬2倍ONで残り回数0のため使用できません。"
  };

  results.innerHTML = actionKeys.map(key => {
    const item = summaries[key];
    const valid = Number.isFinite(item.value);
    const isBest = valid && Math.abs(item.value - bestImmediate) < 1e-7;
    return `
      <article class="result ${isBest ? "best" : ""} ${valid ? "" : "invalid"}">
        <div class="result-head">
          <div class="action-name">${labels[key]}</div>
          ${isBest ? `<div class="badge">最善</div>` : ""}
        </div>
        <div class="value">${valid ? formatNumber(item.value) : "不可"}</div>
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
      byId("status").innerHTML = `<div class="notice error">既に5枚引いているため、これ以上反映できません。</div>`;
      return;
    }
    if (currentCount <= 0) {
      byId("status").innerHTML = `<div class="notice error">戦力${power}の山札残り枚数がありません。</div>`;
      return;
    }
    countInput.value = currentCount - 1;
    drawnInput.value = readInt(`drawn${power}`, 0) + 1;
    calculate();
  });
});

byId("clear").addEventListener("click", () => {
  ids.forEach(id => {
    byId(id).value = "";
  });
  byId("doubleActive").checked = false;
  calculate();
});

document.querySelectorAll("input").forEach(input => {
  input.addEventListener("change", calculate);
});

calculate();
