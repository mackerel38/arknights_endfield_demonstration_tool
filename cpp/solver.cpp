#include <array>
#include <cmath>
#include <cstdint>
#include <limits>
#include <unordered_map>

namespace {

constexpr int kMaxDraw = 5;
constexpr int kPower[5] = {1, 2, 3, 4, 5};
constexpr double kRewards[11] = {
    0.0, 1000.0, 2000.0, 4000.0, 7500.0, 12000.0,
    20000.0, 36000.0, 60000.0, 100000.0, 160000.0};

struct State {
  int attempts;
  int freeDiscards;
  int doubleUses;
  int doubleActive;
  int total;
  std::array<int, 5> drawn;
  std::array<int, 5> base;

  bool operator==(const State& other) const {
    return attempts == other.attempts &&
           freeDiscards == other.freeDiscards &&
           doubleUses == other.doubleUses &&
           doubleActive == other.doubleActive &&
           total == other.total &&
           drawn == other.drawn &&
           base == other.base;
  }
};

struct StateHash {
  std::size_t operator()(const State& state) const {
    std::uint64_t hash = 1469598103934665603ull;
    auto mix = [&hash](int value) {
      hash ^= static_cast<std::uint64_t>(value + 0x9e3779b9);
      hash *= 1099511628211ull;
    };
    mix(state.attempts);
    mix(state.freeDiscards);
    mix(state.doubleUses);
    mix(state.doubleActive);
    mix(state.total);
    for (int value : state.drawn) mix(value);
    for (int value : state.base) mix(value);
    return static_cast<std::size_t>(hash);
  }
};

std::unordered_map<State, double, StateHash> memo;
double lastValues[5] = {0.0, 0.0, 0.0, 0.0, 0.0};

int sumCards(const std::array<int, 5>& cards) {
  int total = 0;
  for (int value : cards) total += value;
  return total;
}

std::array<int, 5> currentDeck(const State& state) {
  std::array<int, 5> deck{};
  for (int i = 0; i < 5; ++i) {
    deck[i] = state.base[i] - state.drawn[i];
  }
  return deck;
}

double bestValue(const State& state);

double settleValue(const State& state) {
  if (state.attempts <= 0) return -std::numeric_limits<double>::infinity();
  if (state.doubleActive && state.doubleUses <= 0) {
    return -std::numeric_limits<double>::infinity();
  }

  const int score = ((state.total % 11) + 11) % 11;
  const double gained = kRewards[score] * (state.doubleActive ? 2.0 : 1.0);

  State next = state;
  next.attempts -= 1;
  next.doubleUses -= state.doubleActive ? 1 : 0;
  next.doubleActive = 0;
  next.drawn = {0, 0, 0, 0, 0};
  next.total = 0;
  return gained + bestValue(next);
}

double discardValue(const State& state) {
  State next = state;
  if (state.freeDiscards > 0) {
    next.freeDiscards -= 1;
  } else {
    if (state.attempts <= 0) return -std::numeric_limits<double>::infinity();
    next.attempts -= 1;
  }
  next.doubleActive = 0;
  next.drawn = {0, 0, 0, 0, 0};
  next.total = 0;
  return bestValue(next);
}

double drawValue(const State& state) {
  if (sumCards(state.drawn) >= kMaxDraw) {
    return -std::numeric_limits<double>::infinity();
  }

  const std::array<int, 5> deck = currentDeck(state);
  const int deckTotal = sumCards(deck);
  if (deckTotal <= 0) return -std::numeric_limits<double>::infinity();

  double expected = 0.0;
  for (int i = 0; i < 5; ++i) {
    if (deck[i] <= 0) continue;
    State next = state;
    next.drawn[i] += 1;
    next.total += kPower[i];
    expected += (static_cast<double>(deck[i]) / deckTotal) * bestValue(next);
  }
  return expected;
}

bool canToggleDouble(const State& state) {
  if (sumCards(state.drawn) > 2) return false;
  if (!state.doubleActive && state.doubleUses <= 0) return false;
  return true;
}

double coreValue(const State& state) {
  return std::max(drawValue(state), std::max(discardValue(state), settleValue(state)));
}

double bestValue(const State& state) {
  if (state.attempts <= 0) return 0.0;

  const auto found = memo.find(state);
  if (found != memo.end()) return found->second;

  double value = coreValue(state);
  if (canToggleDouble(state)) {
    State toggled = state;
    toggled.doubleActive = toggled.doubleActive ? 0 : 1;
    value = std::max(value, coreValue(toggled));
  }
  if (!std::isfinite(value)) value = 0.0;

  memo.emplace(state, value);
  return value;
}

}  // namespace

extern "C" {

void solve(int attempts,
           int freeDiscards,
           int doubleUses,
           int doubleActive,
           int count1,
           int count2,
           int count3,
           int count4,
           int count5,
           int drawn1,
           int drawn2,
           int drawn3,
           int drawn4,
           int drawn5) {
  State state{};
  state.attempts = attempts;
  state.freeDiscards = freeDiscards;
  state.doubleUses = doubleUses;
  state.doubleActive = doubleActive ? 1 : 0;
  state.drawn = {drawn1, drawn2, drawn3, drawn4, drawn5};
  state.base = {count1, count2, count3, count4, count5};
  state.total = drawn1 + drawn2 * 2 + drawn3 * 3 + drawn4 * 4 + drawn5 * 5;

  lastValues[0] = drawValue(state);
  lastValues[1] = discardValue(state);
  lastValues[2] = canToggleDouble(state)
                      ? bestValue(State{state.attempts,
                                        state.freeDiscards,
                                        state.doubleUses,
                                        state.doubleActive ? 0 : 1,
                                        state.total,
                                        state.drawn,
                                        state.base})
                      : -std::numeric_limits<double>::infinity();
  lastValues[3] = settleValue(state);
  lastValues[4] = bestValue(state);
}

double get_action_value(int index) {
  if (index < 0 || index > 4) return 0.0;
  return lastValues[index];
}

int get_memo_size() {
  return static_cast<int>(memo.size());
}

void clear_memo() {
  memo.clear();
}

}
