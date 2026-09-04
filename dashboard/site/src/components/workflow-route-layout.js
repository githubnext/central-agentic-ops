/**
 * Declarative workflow route layout helpers shared by route-aware workflow views.
 */

/**
 * @typedef {'insights'|'reports'|'runs'} WorkflowRouteVariant
 */

/**
 * @typedef {{
 *   variant: WorkflowRouteVariant,
 *   rootClassName: string,
 *   contentClassName: string,
 *   selectMessage: string,
 *   description: string,
 *   navigationPage: 'packages'|'repositories',
 *   breadcrumbs: Array<{ label: string, href: string }> | undefined
 * }} WorkflowRouteLayout
 */

/**
 * @param {import('./ui-elements.js').ElementRenderContext} context
 * @returns {WorkflowRouteLayout}
 */
export function workflowRouteLayout(context) {
  const variant = workflowRouteVariant(context);
  const insights = variant === 'insights';
  const reports = variant === 'reports';
  return {
    variant,
    rootClassName: insights ? 'workflow-runtime' : 'workflow-detail',
    contentClassName: insights ? 'workflow-runtime-content' : 'workflow-detail-content',
    selectMessage: variant === 'runs'
      ? 'Select a workflow to view its runs.'
      : reports
        ? 'Select a workflow to view its reports.'
        : 'Select a workflow to inspect its runtime.',
    description: reports
      ? 'Durable reports produced by {workflow} in {repository}.'
      : variant === 'runs'
        ? 'Observed runs for {workflow} in {repository}.'
        : 'Run health, AI Credit usage, and operational value for {workflow} in {repository}.',
    navigationPage: insights ? 'packages' : 'repositories',
    breadcrumbs: insights ? undefined : [
      { label: 'Repositories', href: '#page-repositories' },
      {
        label: '{repository}',
        href: '#page-repository-detail?repository={repository-encoded}'
      }
    ]
  };
}

/**
 * @param {import('./ui-elements.js').ElementRenderContext} context
 * @returns {WorkflowRouteVariant}
 */
function workflowRouteVariant(context) {
  const viewElement = typeof context.element === 'string' ? context.element : '';
  if (viewElement === 'workflow-runtime') return 'insights';
  if (viewElement === 'workflow-detail') return 'reports';
  if (viewElement === 'workflow-runs') return 'runs';

  const viewId = String(context.viewId ?? '');
  if (viewId === 'workflow-runs-route') return 'runs';
  if (viewId === 'workflow-runtime-route') return 'insights';
  if (context.pageId === 'workflow-runs') return 'runs';
  if (context.pageId === 'workflow-runtime') return 'insights';
  return 'reports';
}
