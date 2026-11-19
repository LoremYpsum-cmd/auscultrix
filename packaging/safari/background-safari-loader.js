/**
 * Safari build: the background is a non-persistent page (required on iOS) and a classic
 * script, so it cannot use static `import`. This tiny loader pulls in the
 * real background as an ES module (relative imports inside it resolve
 * against background.js itself). All listeners live in background.js.
 */
(function loadAuscultrixBackground() {
  // Static specifier on purpose: keep the dynamic import() specifier static
  // (no runtime URL building). Relative to the generated background
  // page (safari-web-extension://<id>/_generated_background_page.html), this
  // resolves to safari-web-extension://<id>/background.js — same file, no runtime
  // URL building needed. All listeners live in background.js.
  try {
    import('./background.js').catch((err) => {
      console.error('[auscultrix] background module failed', err);
    });
  } catch (err) {
    console.error('[auscultrix] background loader failed', err);
  }
})();
