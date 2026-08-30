/**
 * Registry for JSON-selected dashboard UI elements.
 */

import {
  renderAttentionPanelElement,
  renderControlPlaneStatusElement,
  renderManagedPackagesElement,
  renderPackageAicUtilizationElement
} from './overview-elements.js';
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
  ['control-plane-status', ({ sources }) => renderControlPlaneStatusElement(sources)],
  ['package-aic-utilization', ({ sources }) => renderPackageAicUtilizationElement(sources)],
  ['attention-panel', ({ sources }) => renderAttentionPanelElement(sources)],
  ['managed-packages', ({ sources }) => renderManagedPackagesElement(sources)],
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
