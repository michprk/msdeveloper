// Applique le thème avant le premier affichage (évite un flash clair en mode sombre).
(function () {
  var t = 'light';
  try { t = localStorage.getItem('msdev:theme') || 'light'; } catch (e) { /* rien */ }
  if (t === 'auto') t = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', t);
})();
