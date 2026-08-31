/**
 * Package-worker workflow_dispatch catalog.
 */

import { h } from '../dom.js';
import { renderStatusBadge } from './badge.js';
import { findLink } from './link-content.js';
import { renderLinkedText } from './linked-text.js';

/**
 * @param {import('./ui-elements.js').ElementRenderContext} context
 * @returns {HTMLElement}
 */
export function renderDispatchCatalog(context) {
  const dispatches = packageWorkerDispatches(
    rowsFor(context.sources, 'runs'),
    rowsFor(context.sources, 'workflows')
  );
  const headingId = `${context.pageId}-dispatch-catalog-heading`;
  const search = /** @type {HTMLInputElement} */ (h('input', {
    type: 'search',
    placeholder: 'Run, package, worker, status, or repository',
    autocomplete: 'off'
  }));
  const packageSelect = /** @type {HTMLSelectElement} */ (h(
    'select',
    null,
    h('option', { value: '' }, 'All packages'),
    ...[...new Set(dispatches.map((dispatch) => dispatch.packageName))]
      .sort((left, right) => left.localeCompare(right))
      .map((packageName) => h('option', { value: packageName }, packageName))
  ));
  const result = /** @type {HTMLOutputElement} */ (h('output', { className: 'dispatch-result', 'aria-live': 'polite' }));
  const bodyRows = dispatches.map(renderDispatchRow);
  const region = h(
    'div',
    { className: 'table-region dispatch-table-region', role: 'region', 'aria-labelledby': headingId, tabIndex: 0 },
    h(
      'table',
      { className: 'dispatch-table' },
      h(
        'thead',
        null,
        h('tr', null, ...['Started', 'Package', 'Worker', 'Run title', 'Runtime repository', 'Status']
          .map((label) => h('th', { scope: 'col' }, label)))
      ),
      h(
        'tbody',
        null,
        ...(bodyRows.length > 0
          ? bodyRows
          : [h('tr', null, h('td', { colSpan: 6 }, 'No package-worker dispatches were observed in the current run window.'))])
      )
    )
  );
  const section = h(
    'section',
    { className: 'dispatch-catalog', 'aria-labelledby': headingId },
    h(
      'div',
      { className: 'dispatch-heading' },
      h(
        'div',
        null,
        h('span', { className: 'scope-kicker' }, 'Control-plane activity'),
        h(context.headingTag, { id: headingId }, context.title),
        h(
          'p',
          null,
          'Worker runs whose authoritative GitHub Actions trigger is ',
          h('code', null, 'workflow_dispatch'),
          ', ordered newest first. ',
          coverageLabel(context.sources.runs)
        )
      ),
      h('strong', null, `${dispatches.length.toLocaleString('en')} dispatches`)
    ),
    h(
      'div',
      { className: 'dispatch-toolbar', 'aria-label': 'Dispatch filters' },
      h('label', null, h('span', null, 'Search dispatches'), search),
      h('label', null, h('span', null, 'Package'), packageSelect)
    ),
    result,
    region
  );

  enableDispatchFilter(section, search, packageSelect, result, bodyRows);
  return section;
}

/**
 * @param {Array<Record<string, unknown>>} runs
 * @param {Array<Record<string, unknown>>} workflows
 */
function packageWorkerDispatches(runs, workflows) {
  const workers = new Map(workflows
    .filter((row) => row['workflow-role'] === 'worker' && nonEmptyString(row.package))
    .map((row) => [workflowKey(row), row]));

  return runs
    .filter((run) => run.event === 'workflow_dispatch')
    .flatMap((run) => {
      const worker = workers.get(workflowKey(run));
      if (!worker) return [];
      const conclusion = nonEmptyString(run['run-conclusion']) ? String(run['run-conclusion']) : '';
      const status = conclusion && conclusion !== 'unknown'
        ? conclusion
        : nonEmptyString(run['run-status']) ? String(run['run-status']) : 'unknown';
      return [{
        run,
        packageName: String(worker['package-name'] ?? worker.package),
        workerName: String(worker['workflow-name'] ?? worker.workflow),
        runTitle: String(run['run-title'] ?? `Run ${run.run ?? 'unknown'}`),
        repository: repositoryName(run),
        status
      }];
    })
    .sort((left, right) => Date.parse(String(right.run['started-at'] ?? '')) - Date.parse(String(left.run['started-at'] ?? '')));
}

/** @param {ReturnType<typeof packageWorkerDispatches>[number]} dispatch @returns {HTMLTableRowElement} */
function renderDispatchRow(dispatch) {
  const startedAt = String(dispatch.run['started-at'] ?? '');
  const started = Number.isFinite(Date.parse(startedAt)) ? formatDate(startedAt) : 'Unknown';
  const row = /** @type {HTMLTableRowElement} */ (h(
    'tr',
    {
      'data-dispatch-row': '',
      'data-package': dispatch.packageName,
      'data-search': [
        dispatch.run.run,
        dispatch.packageName,
        dispatch.workerName,
        dispatch.runTitle,
        dispatch.repository,
        dispatch.status
      ].join(' ').toLocaleLowerCase('en')
    },
    h('th', { scope: 'row' }, renderLinkedText(started, findLink(dispatch.run, 'run-link'))),
    h('td', null, dispatch.packageName),
    h('td', null, dispatch.workerName),
    h('td', null, dispatch.runTitle),
    h('td', null, dispatch.repository),
    h('td', null, renderStatusBadge(dispatch.status))
  ));
  if (startedAt) row.querySelector('th')?.setAttribute('data-started-at', startedAt);
  return row;
}

/**
 * @param {HTMLElement} root
 * @param {HTMLInputElement} search
 * @param {HTMLSelectElement} packageSelect
 * @param {HTMLOutputElement} result
 * @param {HTMLTableRowElement[]} rows
 */
function enableDispatchFilter(root, search, packageSelect, result, rows) {
  const window = root.ownerDocument.defaultView;
  const parameters = new URLSearchParams(window?.location.search ?? '');
  search.value = parameters.get('q') ?? '';
  const selectedPackage = parameters.get('package') ?? '';
  if ([...packageSelect.options].some((option) => option.value === selectedPackage)) {
    packageSelect.value = selectedPackage;
  }
  const apply = () => {
    const query = search.value.trim().toLocaleLowerCase('en');
    let matched = 0;
    for (const row of rows) {
      const matches = (!query || String(row.dataset.search).includes(query))
        && (!packageSelect.value || row.dataset.package === packageSelect.value);
      row.hidden = !matches;
      if (matches) matched += 1;
    }
    result.textContent = `${matched.toLocaleString('en')} of ${rows.length.toLocaleString('en')} dispatches`;
  };
  const syncUrl = () => {
    if (!window || !['http:', 'https:'].includes(window.location.protocol)) return;
    const values = [['q', search.value.trim()], ['package', packageSelect.value]];
    for (const [name, value] of values) {
      if (value) parameters.set(name, value);
      else parameters.delete(name);
    }
    const query = parameters.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
  };
  for (const control of [search, packageSelect]) {
    control.addEventListener('input', () => {
      syncUrl();
      apply();
    });
  }
  apply();
  root.dataset.dispatchCatalog = '';
}

/** @param {Record<string, import('../presenter.js').LogicalSourceInput>} sources @param {string} source */
function rowsFor(sources, source) {
  return Array.isArray(sources[source]?.rows) ? sources[source].rows : [];
}

/** @param {Record<string, unknown>} row */
function workflowKey(row) {
  return [row.organization ?? '', row.repository ?? '', row.workflow ?? ''].join('/');
}

/** @param {Record<string, unknown>} row */
function repositoryName(row) {
  const organization = nonEmptyString(row.organization) ? `${row.organization}/` : '';
  return `${organization}${String(row.repository ?? 'Unknown')}`;
}

/** @param {unknown} value */
function nonEmptyString(value) {
  return typeof value === 'string' && value.length > 0;
}

/** @param {string} value */
function formatDate(value) {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC'
  }).format(new Date(value));
}

/** @param {import('../presenter.js').LogicalSourceInput | undefined} source */
function coverageLabel(source) {
  if (!source || source.metadata?.availability === 'unavailable') return 'Actions run data is unavailable.';
  const completeness = source?.metadata?.completeness === 'complete' ? 'Complete' : 'Partial';
  return `${completeness} 24-hour Actions run window.`;
}
