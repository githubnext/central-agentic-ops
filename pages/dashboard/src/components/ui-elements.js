/**
 * Registry for JSON-selected dashboard UI elements.
 */

import { renderOperationalOverview } from './operational-overview.js';
import { renderPackagesView } from './packages-view.js';
import { renderWorkflowTopology } from './workflow-topology.js';

/**
 * @typedef {{
 *   pageId: string,
 *   title: string,
 *   sourceNames: string[],
 *   sources: Record<string, import('../presenter.js').LogicalSourceInput>,
 *   contextDetails: string[],
 *   headingTag: 'h3'|'h4'
 * }} ElementRenderContext
 */

/** @type {Map<string, (context: ElementRenderContext) => HTMLElement | null>} */
const ELEMENT_RENDERERS = new Map([
  ['operational-overview', ({ sources }) => renderOperationalOverview(sources)],
  ['package-activity', ({ sources, pageId }) => renderPackagesView(sources, pageId)],
  ['workflow-topology', ({ pageId, title, sourceNames, sources, contextDetails, headingTag }) => {
    const sourceName = sourceNames[0];
    const source = sources[sourceName];
    if (!source) return null;
    return renderWorkflowTopology(pageId, title, sourceName, source.rows, source.metadata, contextDetails, headingTag);
  }]
]);

/**
 * @param {string} name
 * @param {ElementRenderContext} context
 * @returns {HTMLElement | null}
 */
export function renderUiElement(name, context) {
  return ELEMENT_RENDERERS.get(name)?.(context) ?? null;
}
