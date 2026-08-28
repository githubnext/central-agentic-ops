import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import createAnimationData, { createMobileAnimationData } from "../../docs/assets/control-plane-dispatch.animation.mjs";

const hero = readFileSync("docs/components/HierarchyHero.astro", "utf8");

function decodeAsset(asset) {
  return decodeURIComponent(asset.p.slice(asset.p.indexOf(",") + 1));
}

function withoutRootPalette(svg) {
  return svg.replace(/:root \{[^}]+\}/, ":root {}");
}

test("landing diagram fallbacks use concrete light and dark palettes", () => {
  for (const layout of ["fallback", "mobile"]) {
    const light = readFileSync(`docs/assets/control-plane-dispatch-${layout}.svg`, "utf8");
    const dark = readFileSync(`docs/assets/control-plane-dispatch-${layout}-dark-mode.svg`, "utf8");

    assert.doesNotMatch(light, /prefers-color-scheme/);
    assert.doesNotMatch(dark, /prefers-color-scheme/);
    assert.match(light, /--surface:#fff;/);
    assert.match(dark, /--surface:#161b22;/);
    assert.match(dark, /--foreground:#f0f6fc;/);
    assert.equal(withoutRootPalette(light), withoutRootPalette(dark));
  }

  assert.equal((hero.match(/<source media="\(prefers-color-scheme: dark\)"/g) ?? []).length, 2);
});

test("landing animations resolve embedded assets to the requested palette", () => {
  for (const createData of [createAnimationData, createMobileAnimationData]) {
    const light = createData(false).assets.map(decodeAsset).join("\n");
    const dark = createData(true).assets.map(decodeAsset).join("\n");

    assert.doesNotMatch(light, /prefers-color-scheme/);
    assert.doesNotMatch(dark, /prefers-color-scheme/);
    assert.match(dark, /#a371f7/);
    assert.match(dark, /#3fb950/);
    assert.match(dark, /#161b22/);
    assert.notEqual(light, dark);
  }
});

test("landing animations reinitialize after a color-scheme change", () => {
  assert.match(hero, /createAnimationData\(colorScheme\.matches\)/);
  assert.match(hero, /createMobileAnimationData\(colorScheme\.matches\)/);
  assert.match(hero, /colorScheme\.addEventListener\("change", handleColorSchemeChange\)/);
  assert.match(hero, /colorScheme as MediaQueryList.*\.addListener\(handleColorSchemeChange\)/);
  assert.match(hero, /handleColorSchemeChange\(\) \{\s+destroyHierarchyAnimations\(\);\s+initializeHierarchyAnimations\(\);/);
});