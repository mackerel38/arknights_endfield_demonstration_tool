window.SolverWasm = (() => {
  let module = null;
  let loadPromise = null;
  let status = "not-started";

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function load() {
    if (module) return true;
    if (loadPromise) return loadPromise;

    loadPromise = (async () => {
      status = "loading";
      if (!window.createSolverModule) {
        await loadScript("assets/js/solver-wasm.js");
      }
      module = await window.createSolverModule({
        locateFile(path) {
          if (path.endsWith(".wasm")) return "assets/wasm/solver.wasm";
          return `assets/js/${path}`;
        }
      });
      status = "ready";
      return true;
    })().catch(error => {
      status = "failed";
      console.warn("WebAssembly solver load failed. Falling back to JavaScript.", error);
      return false;
    });

    return loadPromise;
  }

  function isReady() {
    return Boolean(module);
  }

  function getStatus() {
    return status;
  }

  function solve(input) {
    if (!module) return null;
    const counts = input.currentCounts;
    const drawn = input.drawnDetail;
    module._solve(
      input.attempts,
      input.freeDiscards,
      input.doubleUses,
      input.doubleActive ? 1 : 0,
      counts[0],
      counts[1],
      counts[2],
      counts[3],
      counts[4],
      drawn[0],
      drawn[1],
      drawn[2],
      drawn[3],
      drawn[4]
    );
    return {
      draw: module._get_action_value(0),
      discard: module._get_action_value(1),
      double: module._get_action_value(2),
      settle: module._get_action_value(3),
      best: module._get_action_value(4),
      memoSize: module._get_memo_size()
    };
  }

  return { getStatus, isReady, load, solve };
})();
