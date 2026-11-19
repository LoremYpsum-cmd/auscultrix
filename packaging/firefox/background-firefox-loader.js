/**
 * Firefox MV3 has no background.service_worker — the event page is a classic
 * script, so it cannot use static `import`. This tiny loader pulls in the
 * real background as an ES module (relative imports inside it resolve
 * against background.js itself). All listeners live in background.js.
 */
(function loadAuscultrixBackground() {
  // Static specifier on purpose: web-ext/AMO lint flags dynamic import()
  // arguments (UNSAFE_VAR_ASSIGNMENT). Relative to the generated background
  // page (moz-extension://<id>/_generated_background_page.html), this
  // resolves to moz-extension://<id>/background.js — same file, no runtime
  // URL building needed. All listeners live in background.js.
  try {
    import('./background.js').catch((err) => {
      console.error('[auscultrix] background module failed', err);
    });
  } catch (err) {
    console.error('[auscultrix] background loader failed', err);
  }
})();
