import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import createAnimationData, { createMobileAnimationData } from "../../docs/assets/control-plane-dispatch.animation.mjs";
import { buildWizardPolicy, selectConfiguredOperations } from "../../docs/lib/configured-operations.mjs";

const controlPolicy = JSON.parse(readFileSync(".github/workflows/cao.json", "utf8"));

const hero = readFileSync("docs/components/HierarchyHero.astro", "utf8");
const wizard = readFileSync("docs/components/OpsWizard.astro", "utf8");
const wizardPage = readFileSync("docs/pages/wizard.astro", "utf8");
const landingPage = readFileSync("docs/README.md", "utf8");
const catalog = readFileSync("docs/lib/catalog.ts", "utf8");

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

  assert.equal((hero.match(/<source media="\(prefers-color-scheme: light\)"/g) ?? []).length, 2);
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

test("package wizard has its own page linked from the landing page", () => {
  assert.doesNotMatch(hero, /OpsWizard/);
  assert.match(wizardPage, /import OpsWizard from "\.\.\/components\/OpsWizard\.astro"/);
  assert.match(wizardPage, /<OpsWizard \/>/);
  assert.match(landingPage, /link: \/central-agentic-ops\/wizard\//);
});

test("package wizard prompt references the raw setup skill", () => {
  assert.match(
    wizard,
    /https:\/\/raw\.githubusercontent\.com\/githubnext\/central-agentic-ops\/main\/\.github\/skills\/setup-central-agentic-ops\/SKILL\.md/,
  );
});

test("package wizard operations come from the checked-in control policy", () => {
  assert.match(catalog, /import controlPolicy from "\.\.\/\.\.\/\.github\/workflows\/cao\.json"/);
  assert.match(catalog, /selectConfiguredOperations\(controlPolicy, catalogEntries\)/);
  assert.match(wizard, /configuredOperationEntries as operations/);
  assert.doesNotMatch(wizard, /operation\.slug === "dependabot"/);
});

test("configured wizard operations follow policy package order", () => {
  const first = { slug: "first" };
  const second = { slug: "second" };
  const policy = { "control-plane": { packages: { second: {}, first: {} } } };

  assert.deepEqual(selectConfiguredOperations(policy, [first, second]), [second, first]);
});

test("configured wizard operations require a package map", () => {
  assert.throws(
    () => selectConfiguredOperations({}, []),
    /must define control-plane\.packages as an object/,
  );
});

test("configured wizard operations require a matching catalog manifest", () => {
  const policy = { "control-plane": { packages: { missing: {} } } };

  assert.throws(
    () => selectConfiguredOperations(policy, []),
    /Configured package missing must have a catalog manifest/,
  );
});

test("configured wizard operations exclude the repository-local self-care package", () => {
  const first = { slug: "first" };
  const selfCare = { slug: "self-care" };
  const policy = { "control-plane": { packages: { "self-care": {}, first: {} } } };

  assert.deepEqual(selectConfiguredOperations(policy, [first, selfCare]), [first]);
});

test("wizard policy keeps the checked-in package configuration", () => {
  const policy = buildWizardPolicy(controlPolicy, "acme", "dependabot");

  assert.deepEqual(policy["control-plane"].scope["allowed-owners"], ["acme"]);
  assert.equal(policy["control-plane"].packages.dependabot.targets["github/gh-aw"].mode, "live");
  assert.equal(
    policy["control-plane"].packages.dependabot.workers["release-train-updater"].workflow,
    "dependabot-release-train-updater",
  );
  assert.equal("icon" in policy["control-plane"].packages.dependabot, false);
});