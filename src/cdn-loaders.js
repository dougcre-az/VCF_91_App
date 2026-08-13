/* Lazy-load heavy export/upload libs. Degraded CDN = broken export/import only, not a dead app. */
(function (g) {
  var pending = {};
  function loadScript(src) {
    if (pending[src]) return pending[src];
    pending[src] = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () {
        pending[src] = null;
        reject(new Error('Failed to load ' + src + ' (CDN blocked or offline)'));
      };
      document.head.appendChild(s);
    });
    return pending[src];
  }
  g.ensureXlsx = function () {
    if (g.XLSX) return Promise.resolve(g.XLSX);
    return loadScript('https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.min.js').then(function () {
      if (!g.XLSX) throw new Error('XLSX failed to initialize');
      return g.XLSX;
    });
  };
  g.ensureHtml2canvas = function () {
    if (typeof g.html2canvas === 'function') return Promise.resolve(g.html2canvas);
    return loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js').then(function () {
      if (typeof g.html2canvas !== 'function') throw new Error('html2canvas failed to initialize');
      return g.html2canvas;
    });
  };
})(window);
