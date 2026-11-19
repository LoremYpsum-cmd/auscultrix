/**
 * Per-store build flags. This file is replaced in the Safari package by
 * packaging/safari/build-flags.js (see packaging/build.mjs).
 *
 *  - donations: the optional PayPal «coffee» request after a session.
 *    Off in the App Store build: App Store Review Guideline 3.2.1(vi) allows
 *    collecting donations outside in-app purchase only for approved nonprofits.
 */
export const BUILD_FLAGS = Object.freeze({
  target: 'chrome',
  donations: true,
});
