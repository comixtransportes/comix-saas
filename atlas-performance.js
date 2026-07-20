/* ═══════════════════════════════════════════════════════════════════
   COMIX Atlas — atlas-performance.js
   Instrumentação leve de performance (performance.mark / measure).

   • Desligada por padrão. Para habilitar, defina ANTES deste script:
       window.ATLAS_PERF_DEBUG = true;
     ou acrescente ?perf=1 na URL, ou rode no console:
       AtlasPerf.enable()
   • Zero impacto quando desligada (funções viram no-ops).
   • Não altera nenhuma lógica de negócio: apenas observa.
   Uso:
     AtlasPerf.mark('pd:boot:start');
     AtlasPerf.measure('pd:boot', 'pd:boot:start');   // até agora
     AtlasPerf.wrap(obj, 'fnName', 'rotulo');          // mede cada chamada
     AtlasPerf.report();                               // tabela no console
   ═══════════════════════════════════════════════════════════════════ */
(function (w) {
  'use strict';
  var qsOn = false;
  try { qsOn = /[?&]perf=1\b/.test(w.location.search); } catch (_) {}
  var enabled = !!w.ATLAS_PERF_DEBUG || qsOn;

  function now() { return (w.performance && performance.now) ? performance.now() : Date.now(); }

  var records = [];

  var api = {
    get enabled() { return enabled; },
    enable: function () { enabled = true; w.ATLAS_PERF_DEBUG = true; log('instrumentação LIGADA'); },
    disable: function () { enabled = false; w.ATLAS_PERF_DEBUG = false; },

    mark: function (name) {
      if (!enabled) return;
      try { performance.mark(name); } catch (_) {}
    },

    measure: function (name, startMark, endMark) {
      if (!enabled) return;
      try {
        if (endMark) performance.measure(name, startMark, endMark);
        else { performance.mark(name + ':end'); performance.measure(name, startMark, name + ':end'); }
        var entries = performance.getEntriesByName(name, 'measure');
        var e = entries[entries.length - 1];
        if (e) { records.push({ name: name, ms: Math.round(e.duration * 10) / 10, at: Math.round(e.startTime) }); log(name + ' → ' + e.duration.toFixed(1) + 'ms'); }
      } catch (_) {}
    },

    /* Mede a duração de cada chamada de uma função existente (monkey-patch seguro). */
    wrap: function (obj, fnName, label) {
      var target = obj || w;
      var fn = target[fnName];
      if (typeof fn !== 'function' || fn.__atlasPerfWrapped) return;
      var wrapped = function () {
        if (!enabled) return fn.apply(this, arguments);
        var t0 = now();
        try { return fn.apply(this, arguments); }
        finally {
          var dt = now() - t0;
          records.push({ name: (label || fnName), ms: Math.round(dt * 10) / 10, at: Math.round(t0) });
          log((label || fnName) + ' → ' + dt.toFixed(1) + 'ms');
        }
      };
      wrapped.__atlasPerfWrapped = true;
      target[fnName] = wrapped;
    },

    report: function () {
      if (!records.length) { log('sem medições registradas (habilite com AtlasPerf.enable())'); return records; }
      try { console.table(records); } catch (_) { console.log(records); }
      return records;
    },

    clear: function () { records = []; try { performance.clearMarks(); performance.clearMeasures(); } catch (_) {} }
  };

  function log(msg) { try { console.log('%c[AtlasPerf]', 'color:#7c3aed;font-weight:bold', msg); } catch (_) {} }

  w.AtlasPerf = api;
  if (enabled) log('instrumentação ativa (ATLAS_PERF_DEBUG)');
})(window);
