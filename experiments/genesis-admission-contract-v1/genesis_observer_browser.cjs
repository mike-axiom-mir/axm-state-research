const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const htmlPath = process.env.GENESIS_OBSERVER_PATH;
const evidenceDir = process.env.GENESIS_OBSERVER_EVIDENCE || path.join(process.cwd(), 'genesis-observer-evidence');
if (!htmlPath) throw new Error('GENESIS_OBSERVER_PATH is required');
fs.mkdirSync(evidenceDir, { recursive: true });

async function exercise(page, label) {
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', error => pageErrors.push(String(error)));
  page.on('requestfailed', request => failedRequests.push(`${request.method()} ${request.url()}`));

  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
  await page.waitForFunction(() => document.body.dataset.ready === 'true');

  assert.equal(await page.locator('[data-phase-index]').count(), 7, `${label}: seven phases`);
  assert.equal(await page.locator('#canonical-status').textContent(), 'NOT ISSUED');
  assert.equal(await page.locator('#canonical-id').textContent(), 'Not issued');

  await page.locator('[data-phase-index="4"]').click();
  assert.equal(await page.locator('#phase-label').textContent(), 'Validated');
  assert.equal(await page.locator('#canonical-status').textContent(), 'NOT ISSUED');
  assert.equal(await page.locator('#canonical-id').textContent(), 'Not issued');
  assert.match(await page.locator('#next-action').textContent(), /Persist the exact validated admission/);

  await page.locator('[data-phase-index="5"]').click();
  assert.equal(await page.locator('#phase-label').textContent(), 'Genesis / G0');
  assert.equal(await page.locator('#canonical-status').textContent(), 'G0 ADMITTED');
  const canonicalId = await page.locator('#canonical-id').textContent();
  const preparationId = await page.locator('#preparation-id').textContent();
  assert.match(canonicalId, /^g0:observer-lineage:[0-9a-f]{64}$/);
  assert.match(preparationId, /^prep:[0-9a-f]{64}$/);
  assert.equal(await page.locator('#file-fsync span').textContent(), 'OBSERVED');
  assert.equal(await page.locator('#dir-fsync span').textContent(), 'OBSERVED');
  assert.equal(await page.locator('#local-verify').textContent(), 'PASS');

  await page.locator('[data-phase-index="5"]').focus();
  await page.keyboard.press('Home');
  assert.equal(await page.locator('#phase-label').textContent(), 'Unformed');
  await page.keyboard.press('End');
  assert.equal(await page.locator('#phase-label').textContent(), 'Active');
  assert.equal(await page.locator('#canonical-id').textContent(), canonicalId);
  await page.keyboard.press('ArrowLeft');
  assert.equal(await page.locator('#phase-label').textContent(), 'Genesis / G0');

  const metrics = await page.evaluate(() => {
    const phaseTargets = [...document.querySelectorAll('[data-phase-index]')].map(node => node.getBoundingClientRect());
    const controlTargets = [...document.querySelectorAll('.control')].map(node => node.getBoundingClientRect());
    const controls = document.querySelector('.controls');
    const controlsRect = controls.getBoundingClientRect();
    const facts = [...document.querySelectorAll('.fact')].map(node => node.getBoundingClientRect());
    const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    return {
      horizontalOverflowPx: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      minPhaseHeight: Math.min(...phaseTargets.map(rect => rect.height)),
      minControlHeight: Math.min(...controlTargets.map(rect => rect.height)),
      currentCount: document.querySelectorAll('[data-phase-index][aria-current="step"]').length,
      bodyPhase: document.body.dataset.phase,
      controlsPosition: getComputedStyle(controls).position,
      controlsOverlapFacts: facts.some(rect => overlaps(controlsRect, rect)),
    };
  });
  assert.equal(metrics.horizontalOverflowPx, 0, `${label}: no document horizontal overflow`);
  assert.equal(metrics.currentCount, 1, `${label}: one current phase`);
  assert.equal(metrics.bodyPhase, 'GENESIS');
  assert.equal(metrics.controlsPosition, 'static', `${label}: evidence controls stay in document flow`);
  assert.equal(metrics.controlsOverlapFacts, false, `${label}: evidence controls do not cover receipt facts`);
  assert.ok(metrics.minPhaseHeight >= 44, `${label}: phase targets >= 44px`);
  assert.ok(metrics.minControlHeight >= 44, `${label}: previous/next targets >= 44px`);
  assert.deepEqual(consoleErrors, [], `${label}: no console errors`);
  assert.deepEqual(pageErrors, [], `${label}: no page errors`);
  assert.deepEqual(failedRequests, [], `${label}: no failed requests`);

  return { canonicalId, preparationId, consoleErrors, pageErrors, failedRequests, ...metrics };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const desktopPage = await desktopContext.newPage();
    const desktop = await exercise(desktopPage, 'desktop');
    await desktopPage.screenshot({ path: path.join(evidenceDir, 'genesis-observer-desktop.png'), fullPage: true });
    await desktopContext.close();

    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const mobilePage = await mobileContext.newPage();
    const mobile = await exercise(mobilePage, 'mobile');
    await mobilePage.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await mobilePage.locator('#phase-label').textContent(), 'Genesis / G0');
    await mobilePage.screenshot({ path: path.join(evidenceDir, 'genesis-observer-mobile.png'), fullPage: true });
    await mobileContext.close();

    assert.equal(desktop.canonicalId, mobile.canonicalId, 'realization width does not change canonical identity');
    assert.equal(desktop.preparationId, mobile.preparationId, 'realization width does not change preparation identity');

    const receipt = {
      schema: 'axm.genesis-admission-observer-browser-receipt/v1',
      status: 'PASS',
      source: 'generated single-file observer built from real GenesisAdmissionMachine + LocalGenesisCommitStore',
      desktop,
      mobile,
      screenshots: ['genesis-observer-desktop.png', 'genesis-observer-mobile.png'],
      truth_boundary: 'browser selects recorded evidence frames only; no admission transition, merge, promotion, or CANON authority',
    };
    fs.writeFileSync(path.join(evidenceDir, 'browser-receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
    console.log(JSON.stringify(receipt));
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
