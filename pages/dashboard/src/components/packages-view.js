/**
 * Report-style package activity view composed from workflow, run, and usage sources.
 */

import { h } from '../dom.js';
import { formatNumber } from '../view-formatters.js';
import { classifyUtilizationRatio, isFailureConclusion } from './run-classification.js';

const MODES = ['all', 'review', 'live'];
const DAY_IN_MILLISECONDS = 86_400_000;

/**
 * @param {Record<string, import('../presenter.js').LogicalSourceInput>} sources
 * @param {string} [pageId]
 * @returns {HTMLElement}
 */
export function renderPackagesView(sources, pageId = 'packages') {
  let selectedMode = 'all';
  const tabByMode = new Map();
  const panelId = `${pageId}-mode-panel`;
  const content = h('div', { className: 'packages-mode-content', id: panelId, role: 'tabpanel' });
  /**
   * @param {string} mode
   * @param {boolean} [focus]
   */
  const selectMode = (mode, focus = false) => {
    if (mode !== selectedMode) {
      selectedMode = mode;
      renderMode();
    }
    if (focus) tabByMode.get(mode)?.focus();
  };
  const tabs = h(
    'div',
    {
      className: 'package-mode-tabs',
      role: 'tablist',
      'aria-label': 'Filter package activity by mode',
      'aria-orientation': 'horizontal'
    },
    ...MODES.map((mode) => {
      const tab = h(
        'button',
        {
          type: 'button',
          role: 'tab',
          id: `${pageId}-${mode}-tab`,
          'aria-controls': panelId,
          'aria-selected': mode === selectedMode ? 'true' : 'false',
          tabIndex: mode === selectedMode ? 0 : -1,
          dataset: { packageMode: mode },
          onclick: () => selectMode(mode),
          onkeydown: (/** @type {KeyboardEvent} */ event) => {
            const key = event.key;
            const currentIndex = MODES.indexOf(mode);
            let nextIndex = null;
            if (key === 'ArrowRight' || key === 'ArrowDown') nextIndex = (currentIndex + 1) % MODES.length;
            if (key === 'ArrowLeft' || key === 'ArrowUp') nextIndex = (currentIndex - 1 + MODES.length) % MODES.length;
            if (key === 'Home') nextIndex = 0;
            if (key === 'End') nextIndex = MODES.length - 1;
            if (nextIndex !== null) {
              event.preventDefault();
              selectMode(MODES[nextIndex], true);
            }
          }
        },
        titleCase(mode)
      );
      tabByMode.set(mode, tab);
      return tab;
    })
  );

  const renderMode = () => {
    for (const [mode, tab] of tabByMode) {
      tab.setAttribute('aria-selected', mode === selectedMode ? 'true' : 'false');
      tab.tabIndex = mode === selectedMode ? 0 : -1;
    }
    content.setAttribute('aria-labelledby', `${pageId}-${selectedMode}-tab`);
    content.replaceChildren(
      renderPackageUtilization(sources, selectedMode, `${pageId}-utilization-heading`)
    );
    content.dispatchEvent(new CustomEvent('package-mode-change', {
      bubbles: true,
      detail: { pageId, mode: selectedMode }
    }));
  };

  renderMode();
  return h('div', { className: 'packages-view' }, tabs, content);
}

/**
 * @param {Record<string, import('../presenter.js').LogicalSourceInput>} sources
 * @param {string} [pageId]
 * @returns {HTMLElement}
 */
export function renderPackageRunTrend(sources, pageId = 'packages') {
  let selectedMode = 'all';
  const content = h('div', { className: 'packages-mode-content' });
  const controller = new AbortController();
  const renderMode = () => {
    content.replaceChildren(renderRunTrend(sources, selectedMode, `${pageId}-trend-heading`));
  };
  content.ownerDocument.addEventListener('package-mode-change', (event) => {
    if (!(event instanceof CustomEvent) || event.detail?.pageId !== pageId) return;
    selectedMode = event.detail.mode;
    renderMode();
  }, { signal: controller.signal });
  const observer = new MutationObserver(() => {
    if (!content.isConnected) {
      controller.abort();
      observer.disconnect();
    }
  });
  observer.observe(content.ownerDocument, { childList: true, subtree: true });
  renderMode();
  return content;
}

/**
 * @param {Record<string, import('../presenter.js').LogicalSourceInput>} sources
 * @param {string} mode
 * @param {string} headingId
 * @returns {HTMLElement}
 */
function renderPackageUtilization(sources, mode, headingId) {
  const workflows = rowsFor(sources, 'workflows');
  const usage = rowsFor(sources, 'usage');
  const packages = summarizePackages(workflows);
  const utilization = summarizeUtilization(packages, usage, mode);
  const usageMetadata = sources.usage?.metadata;
  const available = Boolean(sources.usage) && usageMetadata?.availability !== 'unavailable';
  const completeness = usageMetadata?.completeness ?? 'unknown';
  const windowLabel = sourceWindowLabel(usageMetadata);
  const modeLabel = mode;

  return h(
    'section',
    { className: 'package-utilization', 'aria-labelledby': headingId },
    h(
      'header',
      { className: 'package-utilization-heading' },
      h('h3', { id: headingId }, 'Package AIC utilization'),
      h(
        'p',
        null,
        available
          ? `Actual AI Credits against summed per-run limits for ${modeLabel} package runs retained from ${windowLabel}.`
          : 'AI Credit usage artifacts are unavailable.'
      )
    ),
    h(
      'div',
      { className: 'package-utilization-grid' },
      ...(packages.length > 0
        ? packages.map((entry) => renderUtilizationCard(entry, utilization.get(entry.key), available, completeness))
        : [h('p', { className: 'empty' }, 'No centrally managed packages were observed.')])
    )
  );
}

/**
 * @param {ReturnType<typeof summarizePackages>[number]} entry
 * @param {{ used: number, allowed: number, reportedRuns: number } | undefined} utilization
 * @param {boolean} available
 * @param {string} completeness
 * @returns {HTMLElement}
 */
function renderUtilizationCard(entry, utilization, available, completeness) {
  const used = utilization?.used ?? 0;
  const allowed = utilization?.allowed ?? 0;
  const reportedRuns = utilization?.reportedRuns ?? 0;
  const ratio = available && allowed > 0 ? used / allowed : null;
  const meterPercent = ratio === null ? 0 : Math.min(100, ratio * 100);
  const status = ratio === null ? 'empty' : classifyUtilizationRatio(ratio);
  const detail = !available
    ? 'AI Credit usage artifacts are unavailable.'
    : reportedRuns === 0
      ? 'No AIC usage was reported in the retained window.'
      : `${formatAic(used)} of ${formatAic(allowed)} AIC across ${formatNumber(reportedRuns)} reported run${reportedRuns === 1 ? '' : 's'}.`;
  const coverage = !available
    ? ''
    : completeness === 'partial'
      ? ' Partial usage coverage.'
      : completeness === 'unknown' ? ' Usage coverage is unknown.' : '';
  const ariaLabel = ratio === null
    ? `${entry.name}: no utilization available`
    : `${entry.name}: ${formatAic(used)} of ${formatAic(allowed)} AI Credits used, ${formatPercent(ratio)}`;
  const scopeLabel = [entry.organization, entry.repository].filter(Boolean).join('/');

  return h(
    'article',
    {
      className: `package-utilization-card utilization-${status}`,
      dataset: {
        packageId: entry.id,
        packageKey: entry.key,
        packageOrganization: entry.organization,
        packageRepository: entry.repository
      }
    },
    h(
      'header',
      null,
      h(
        'span',
        { className: 'package-utilization-identity' },
        h('strong', null, entry.name),
        scopeLabel ? h('small', null, scopeLabel) : null
      ),
      h('span', { className: 'package-utilization-value' }, ratio === null ? '—' : formatPercent(ratio))
    ),
    h(
      'div',
      { className: 'utilization-track', role: 'img', 'aria-label': ariaLabel },
      h('span', { style: `width: ${meterPercent.toFixed(2)}%` })
    ),
    h('p', null, detail, coverage),
    h(
      'small',
      null,
      entry.completeAttemptAllowance === null
        ? 'Complete package attempt allowance unavailable'
        : `${formatAic(entry.completeAttemptAllowance)} AIC allowance per complete package attempt`
    )
  );
}

/**
 * @param {Record<string, import('../presenter.js').LogicalSourceInput>} sources
 * @param {string} mode
 * @param {string} headingId
 * @returns {HTMLElement}
 */
function renderRunTrend(sources, mode, headingId) {
  const workflows = rowsFor(sources, 'workflows');
  const runsSource = sources.runs;
  const modeLabel = titleCase(mode);
  const heading = `${modeLabel} runs over time`;
  if (!runsSource || runsSource.metadata?.availability === 'unavailable') {
    return renderUnavailableRunTrend(heading, headingId, 'Package run data is unavailable.');
  }
  const packageWorkflows = new Set(workflows
    .filter(isPackageWorkflow)
    .map((row) => scopedEntityKey(row, 'workflow')));
  const allRuns = rowsFor(sources, 'runs')
    .filter((row) => packageWorkflows.has(scopedEntityKey(row, 'workflow')))
    .filter((row) => mode === 'all' || row['rollout-mode'] === mode);
  const trendDays = buildTrendDays(sources.runs, allRuns);
  if (trendDays.length === 0) {
    return renderUnavailableRunTrend(heading, headingId, 'Package run trend is unavailable because no reporting date was provided.');
  }
  const windowStart = trendDays[0]?.getTime() ?? Number.NEGATIVE_INFINITY;
  const windowEnd = (trendDays.at(-1)?.getTime() ?? Number.POSITIVE_INFINITY) + DAY_IN_MILLISECONDS;
  const runs = allRuns.filter((row) => {
    const startedAt = Date.parse(String(row['started-at'] ?? ''));
    return Number.isFinite(startedAt) && startedAt >= windowStart && startedAt < windowEnd;
  });
  const series = {
    successful: cumulativeCounts(trendDays, runs.filter((row) => row['run-conclusion'] === 'success')),
    failed: cumulativeCounts(trendDays, runs.filter((row) => isFailureConclusion(row['run-conclusion']))),
    cancelled: cumulativeCounts(trendDays, runs.filter((row) => row['run-conclusion'] === 'cancelled'))
  };
  const maximum = Math.max(1, ...series.successful, ...series.failed, ...series.cancelled);
  const chartDescription = `Daily cumulative successful, failed, and cancelled ${modeLabel.toLowerCase()} package run counts.`;
  const coverage = runsSource.metadata?.completeness === 'partial'
    ? 'Partial run coverage.'
    : runsSource.metadata?.completeness === 'unknown' ? 'Run coverage is unknown.' : null;

  return h(
    'section',
    { className: 'package-trend-panel', 'aria-labelledby': headingId },
    h(
      'header',
      null,
      h(
        'div',
        null,
        h('h3', { id: headingId }, heading),
        h(
          'p',
          null,
          h('strong', null, formatNumber(runs.length)),
          h('span', null, `as of ${formatDate(trendDays.at(-1))}`)
        )
      ),
      h('span', { className: 'package-trend-group' }, 'Group by: ', h('strong', null, 'Status'))
    ),
    h(
      'div',
      { className: 'package-trend-legend', 'aria-label': 'Run status legend' },
      renderLegendItem('successful', 'Successful'),
      renderLegendItem('failed', 'Failed'),
      renderLegendItem('cancelled', 'Cancelled')
    ),
    h(
      'div',
      { className: 'package-trend-chart' },
      h(
        'svg',
        {
          viewBox: '0 0 800 240',
          role: 'img',
          'aria-label': chartDescription,
          preserveAspectRatio: 'xMinYMin meet'
        },
        h('title', null, `${heading} for the last 30 days`),
        h('line', { x1: 58, y1: 50, x2: 772, y2: 50 }),
        h('line', { x1: 58, y1: 125, x2: 772, y2: 125 }),
        h('line', { x1: 58, y1: 200, x2: 772, y2: 200 }),
        ...[58, 201, 344, 487, 630, 772].map((x) => h('line', { className: 'vertical-grid', x1: x, y1: 50, x2: x, y2: 200 })),
        h('text', { x: 8, y: 54 }, formatNumber(maximum)),
        h('text', { x: 8, y: 129 }, formatNumber(maximum / 2)),
        h('text', { x: 8, y: 204 }, '0'),
        h('polyline', { className: 'package-chart-successful', points: trendPoints(series.successful, maximum) }),
        h('polyline', { className: 'package-chart-failed', points: trendPoints(series.failed, maximum) }),
        h('polyline', { className: 'package-chart-cancelled', points: trendPoints(series.cancelled, maximum) }),
        ...renderTrendPoints(trendDays, series, maximum)
      ),
      h(
        'div',
        { className: 'package-trend-axis' },
        h('span', null, formatDate(trendDays[0], true)),
        h('span', null, formatDate(trendDays.at(-1), true))
      )
    ),
    coverage ? h('p', { className: 'package-trend-coverage' }, coverage) : null
  );
}

/**
 * @param {string} heading
 * @param {string} headingId
 * @param {string} message
 * @returns {HTMLElement}
 */
function renderUnavailableRunTrend(heading, headingId, message) {
  return h(
    'section',
    { className: 'package-trend-panel', 'aria-labelledby': headingId },
    h('header', null, h('div', null, h('h3', { id: headingId }, heading))),
    h('p', { className: 'empty' }, message)
  );
}

/**
 * @param {string} status
 * @param {string} label
 * @returns {HTMLElement}
 */
function renderLegendItem(status, label) {
  return h('span', null, h('i', { className: `package-legend-${status}`, 'aria-hidden': 'true' }), label);
}

/**
 * @param {Date[]} days
 * @param {{ successful: number[], failed: number[], cancelled: number[] }} series
 * @param {number} maximum
 * @returns {SVGElement[]}
 */
function renderTrendPoints(days, series, maximum) {
  return /** @type {SVGElement[]} */ (days.map((day, index) => {
    const x = 58 + (index * 714 / 29);
    const tooltipX = Math.min(578, Math.max(4, x - 95));
    const values = {
      successful: series.successful[index],
      failed: series.failed[index],
      cancelled: series.cancelled[index]
    };
    const label = `${formatDate(day, true)}: ${values.successful} successful, ${values.failed} failed, ${values.cancelled} cancelled runs`;
    return /** @type {SVGElement} */ (/** @type {unknown} */ (h(
      'g',
      { className: 'package-chart-point', tabIndex: 0, role: 'img', 'aria-label': label },
      h('rect', { className: 'package-point-hit', x: x - 12, y: 40, width: 24, height: 170 }),
      ...Object.entries(values).map(([status, value]) => h('circle', {
        className: `package-point-marker package-point-marker-${status}`,
        cx: x,
        cy: 200 - (value * 150 / maximum),
        r: 5
      })),
      h(
        'g',
        { className: 'package-point-tooltip', transform: `translate(${tooltipX} 44)`, 'aria-hidden': 'true' },
        h('rect', { width: 190, height: 92, rx: 6 }),
        h('text', { className: 'tooltip-date', x: 12, y: 20 }, formatDate(day, true)),
        renderTooltipLine('successful', 'Successful', values.successful, 42),
        renderTooltipLine('failed', 'Failed', values.failed, 62),
        renderTooltipLine('cancelled', 'Cancelled', values.cancelled, 82)
      )
    )));
  }));
}

/**
 * @param {string} status
 * @param {string} label
 * @param {number} value
 * @param {number} y
 * @returns {SVGElement}
 */
function renderTooltipLine(status, label, value, y) {
  return /** @type {SVGElement} */ (/** @type {unknown} */ (h(
    'g',
    null,
    h('text', { className: `tooltip-swatch tooltip-swatch-${status}`, x: 12, y }, status === 'successful' ? '—' : '---'),
    h('text', { className: 'tooltip-label', x: 28, y }, label),
    h('text', { className: 'tooltip-value', x: 178, y, 'text-anchor': 'end' }, String(value))
  )));
}

/**
 * @param {Array<Record<string, unknown>>} workflows
 */
function summarizePackages(workflows) {
  /** @type {Map<string, Array<Record<string, unknown>>>} */
  const grouped = new Map();
  for (const row of workflows) {
    if (!isPackageWorkflow(row)) continue;
    const packageKey = scopedEntityKey(row, 'package');
    const rows = grouped.get(packageKey) ?? [];
    rows.push(row);
    grouped.set(packageKey, rows);
  }
  return [...grouped.entries()].map(([key, rows]) => {
    const firstRow = rows[0] ?? {};
    const uniqueWorkflowAllowances = new Map(rows
      .filter((row) => typeof row.workflow === 'string' && isNonNegativeNumber(row['max-ai-credits']))
      .map((row) => [scopedEntityKey(row, 'workflow'), /** @type {number} */ (row['max-ai-credits'])]));
    const summedAllowance = [...uniqueWorkflowAllowances.values()]
      .reduce((total, value) => total + value, 0);
    const id = String(firstRow.package);
    return {
      key,
      id,
      name: String(rows.find((row) => typeof row['package-name'] === 'string')?.['package-name'] ?? titleCase(id)),
      organization: String(firstRow.organization ?? ''),
      repository: String(firstRow.repository ?? ''),
      completeAttemptAllowance: uniqueWorkflowAllowances.size > 0 ? summedAllowance : null,
      workflows: rows
    };
  }).sort((left, right) => left.name.localeCompare(right.name));
}

/**
 * @param {ReturnType<typeof summarizePackages>} packages
 * @param {Array<Record<string, unknown>>} usage
 * @param {string} mode
 * @returns {Map<string, { used: number, allowed: number, reportedRuns: number }>}
 */
function summarizeUtilization(packages, usage, mode) {
  const workflowDetails = new Map(packages.flatMap((entry) => entry.workflows.map((row) => [
    scopedEntityKey(row, 'workflow'),
    { packageKey: entry.key, allowance: Number(row['max-ai-credits']) }
  ])));
  /** @type {Map<string, { packageKey: string, used: number, allowance: number }>} */
  const runs = new Map();
  for (const row of usage) {
    if (mode !== 'all' && row['rollout-mode'] !== mode) continue;
    const details = workflowDetails.get(scopedEntityKey(row, 'workflow'));
    const aic = Number(row.aic);
    if (!details || !Number.isFinite(aic) || aic < 0) continue;
    const runId = String(row.run ?? row.invocation ?? '');
    if (!runId) continue;
    const key = JSON.stringify([details.packageKey, scopedEntityKey(row, row.run == null ? 'invocation' : 'run')]);
    const run = runs.get(key) ?? {
      packageKey: details.packageKey,
      used: 0,
      allowance: Number.isFinite(details.allowance) && details.allowance > 0 ? details.allowance : 0
    };
    run.used += aic;
    runs.set(key, run);
  }
  /** @type {Map<string, { used: number, allowed: number, reportedRuns: number }>} */
  const totals = new Map();
  for (const run of runs.values()) {
    const total = totals.get(run.packageKey) ?? { used: 0, allowed: 0, reportedRuns: 0 };
    total.used += run.used;
    total.allowed += run.allowance;
    total.reportedRuns += 1;
    totals.set(run.packageKey, total);
  }
  return totals;
}

/**
 * @param {import('../presenter.js').LogicalSourceInput | undefined} source
 * @param {Array<Record<string, unknown>>} runs
 * @returns {Date[]}
 */
function buildTrendDays(source, runs) {
  const metadataDate = Date.parse(String(source?.metadata?.['as-of'] ?? source?.metadata?.['retrieved-at'] ?? ''));
  const latestRunDate = Math.max(...runs.map((row) => Date.parse(String(row['started-at'] ?? ''))).filter(Number.isFinite));
  const endTimestamp = Number.isFinite(metadataDate) ? metadataDate : latestRunDate;
  if (!Number.isFinite(endTimestamp)) return [];
  const end = new Date(endTimestamp);
  end.setUTCHours(0, 0, 0, 0);
  return Array.from({ length: 30 }, (_, index) => new Date(end.getTime() - ((29 - index) * DAY_IN_MILLISECONDS)));
}

/**
 * @param {Date[]} days
 * @param {Array<Record<string, unknown>>} runs
 * @returns {number[]}
 */
function cumulativeCounts(days, runs) {
  return days.map((day) => {
    const endOfDay = day.getTime() + DAY_IN_MILLISECONDS;
    return runs.filter((row) => Date.parse(String(row['started-at'])) < endOfDay).length;
  });
}

/**
 * @param {number[]} values
 * @param {number} maximum
 * @returns {string}
 */
function trendPoints(values, maximum) {
  return values.map((value, index) => `${58 + (index * 714 / 29)},${200 - (value * 150 / maximum)}`).join(' ');
}

/**
 * @param {import('../presenter.js').SourceMetadata | undefined} metadata
 * @returns {string}
 */
function sourceWindowLabel(metadata) {
  const start = Date.parse(String(metadata?.['coverage-start'] ?? ''));
  const end = Date.parse(String(metadata?.['coverage-end'] ?? ''));
  if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
    const hours = Math.round((end - start) / 3_600_000);
    return `the last ${formatNumber(hours)} hour${hours === 1 ? '' : 's'}`;
  }
  return 'the retained usage window';
}

/**
 * @param {Record<string, import('../presenter.js').LogicalSourceInput>} sources
 * @param {string} name
 * @returns {Array<Record<string, unknown>>}
 */
function rowsFor(sources, name) {
  return Array.isArray(sources[name]?.rows) ? sources[name].rows : [];
}

/**
 * @param {Record<string, unknown>} row
 * @returns {boolean}
 */
function isPackageWorkflow(row) {
  return typeof row.package === 'string'
    && row.package.length > 0
    && (row['workflow-role'] === 'orchestrator' || row['workflow-role'] === 'worker');
}

/**
 * @param {Record<string, unknown>} row
 * @param {string} field
 * @returns {string}
 */
function scopedEntityKey(row, field) {
  return JSON.stringify([
    String(row.organization ?? ''),
    String(row.repository ?? ''),
    String(row[field] ?? '')
  ]);
}

/**
 * @param {unknown} value
 * @returns {value is number}
 */
function isNonNegativeNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/**
 * @param {number} value
 * @returns {string}
 */
function formatAic(value) {
  return new Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(value);
}

/**
 * @param {number} value
 * @returns {string}
 */
function formatPercent(value) {
  return `${new Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(value * 100)}%`;
}

/**
 * @param {Date | undefined} value
 * @param {boolean} [dateOnly]
 * @returns {string}
 */
function formatDate(value, dateOnly = false) {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) return 'Unavailable';
  return new Intl.DateTimeFormat('en', dateOnly
    ? { dateStyle: 'medium', timeZone: 'UTC' }
    : { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(value);
}

/**
 * @param {string} value
 * @returns {string}
 */
function titleCase(value) {
  return value.split('-').filter(Boolean).map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`).join(' ');
}
