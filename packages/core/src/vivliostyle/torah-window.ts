/**
 * Copyright 2026 Vivliostyle Foundation
 *
 * Vivliostyle.js is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Vivliostyle.js is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Vivliostyle.js.  If not, see <http://www.gnu.org/licenses/>.
 *
 * @fileoverview TorahWindow - Implements hanging-indent typography for Hebrew text
 */

import * as Css from "./css";
import * as Logging from "./logging";
import * as Plugin from "./plugin";
import type { Layout, Vtree } from "./types";

/**
 * Torah Window Plugin
 *
 * Implements "hanging indent" typography style used in Torah/religious texts:
 * The second line onwards are indented by the width of the first word + space.
 *
 * CSS Usage:
 *   p { hanging-indent: first-word; }
 *
 * Approach:
 * 1. Parse the CSS property during element style preprocessing
 * 2. After block layout, measure the first word width
 * 3. Apply the indent to subsequent lines using CSS transforms or margins
 */

const PROPERTY_NAME = "hanging-indent";
const VALUE_FIRST_WORD = "first-word";
const VALUE_NONE = "none";

/**
 * Hook: PREPROCESS_ELEMENT_STYLE
 * Captures the hanging-indent property value and stores it in nodeContext
 */
const preprocessElementStyle: Plugin.PreProcessElementStyleHook = (
  nodeContext: Vtree.NodeContext,
  style: { [key: string]: Css.Val },
): void => {
  const hangingIndent = style[PROPERTY_NAME];

  if (!hangingIndent) {
    return;
  }

  // Extract the value as a string
  let value: string;
  if (hangingIndent instanceof Css.Ident) {
    value = hangingIndent.name;
  } else if (typeof hangingIndent === "string") {
    value = hangingIndent;
  } else {
    value = hangingIndent.toString();
  }

  // Store in nodeContext for later use during layout
  if (!nodeContext.inheritedProps) {
    nodeContext.inheritedProps = {};
  }
  nodeContext.inheritedProps[PROPERTY_NAME] = value;

  if (VIVLIOSTYLE_DEBUG) {
    Logging.logger.debug(
      `[TorahWindow] Stored ${PROPERTY_NAME}=${value} on ${nodeContext.sourceNode?.nodeName}`,
    );
  }
};

interface RegExpNodeMatchArray extends Array<Range> {
  groups?: {
    [key: string]: Range;
  };
}

function matchRegExpNode(
  regex: RegExp,
  node: Node,
): RegExpNodeMatchArray | null {
  const nodes = [];
  const nodeIterator = document.createNodeIterator(node, NodeFilter.SHOW_TEXT);
  while ((node = nodeIterator.nextNode())) {
    nodes.push(node);
  }
  const nodesMap: {
    node: Node;
    start: number;
    end: number;
  }[] = [];
  let allText = "";
  for (const n of nodes) {
    const text = n.textContent || "";
    const start = allText.length;
    allText += text;
    const end = allText.length;
    nodesMap.push({ node: n, start, end });
  }
  const match = regex.exec(allText);
  if (!match || !match.indices) {
    return null;
  }
  const result: RegExpNodeMatchArray = [];
  for (let i = 0; i < match.indices.length; i++) {
    const [matchStart, matchEnd] = match.indices[i];
    result.push(initializeNodeRange(matchStart, matchEnd));
  }
  if (match.indices.groups) {
    result.groups = {};
    for (const [groupName, [start, end]] of Object.entries(
      match.indices.groups,
    )) {
      result.groups[groupName] = initializeNodeRange(start, end);
    }
  }
  return result;

  function initializeNodeRange(start: number, end: number) {
    const mapToNodes = (offset: number) =>
      nodesMap.find((n) => n.end >= offset);
    const startNodeInfo = mapToNodes(start);
    const startNormalizedOffset = start - startNodeInfo.start;
    const endNodeInfo = mapToNodes(end);
    const endNormalizedOffset = end - endNodeInfo.start;
    const range = document.createRange();
    range.setStart(startNodeInfo.node, startNormalizedOffset);
    range.setEnd(endNodeInfo.node, endNormalizedOffset);
    return range;
  }
}

/**
 * Hook: POST_LAYOUT_BLOCK
 * Applies hanging indent after the block has been laid out
 */
const postLayoutBlock: Plugin.PostLayoutBlockHook = (
  nodeContext: Vtree.NodeContext,
  checkPoints: Vtree.NodeContext[],
  column: Layout.Column,
): void => {
  // Only process block-level elements
  if (!nodeContext || nodeContext.inline) {
    return;
  }

  // Only process block-level elements on their first fragment
  if (nodeContext.inline || nodeContext.fragmentIndex > 1) {
    return;
  }

  // Check if this block has hanging-indent property
  const inheritedProps = nodeContext.inheritedProps;
  if (!inheritedProps || !inheritedProps[PROPERTY_NAME]) {
    return;
  }

  const value = inheritedProps[PROPERTY_NAME];
  if (value !== VALUE_FIRST_WORD) {
    return;
  }

  // Get the rendered block element
  const blockElement = nodeContext.viewNode as HTMLElement;
  if (!blockElement || blockElement.nodeType !== Node.ELEMENT_NODE) {
    return;
  }

  if (VIVLIOSTYLE_DEBUG) {
    Logging.logger.debug(
      `[TorahWindow] Applying hanging-indent to ${blockElement.nodeName}`,
    );
  }

  applyHangingIndent(blockElement, column);
};

function boundingRectFromRects(
  rects: DOMRectList | DOMRect[] | Vtree.ClientRect[],
): Vtree.ClientRect {
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;

  for (const r of rects) {
    left = Math.min(left, r.left);
    top = Math.min(top, r.top);
    right = Math.max(right, r.right);
    bottom = Math.max(bottom, r.bottom);
  }

  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
  };
}

/**
 * Apply hanging indent to a block element
 */
function applyHangingIndent(
  blockElement: HTMLElement,
  column: Layout.Column,
): void {
  const firstWordAndSpaceRange = matchRegExpNode(
    /^\s*(?<word>\S+\s)/du,
    blockElement,
  )?.groups?.word;
  if (!firstWordAndSpaceRange) {
    if (VIVLIOSTYLE_DEBUG) {
      Logging.logger.debug("[TorahWindow] No first word found");
    }
    return;
  }

  const rect = boundingRectFromRects(
    column.clientLayout.getRangeClientRects(firstWordAndSpaceRange),
  );
  const firstWord = firstWordAndSpaceRange[1]?.toString();
  const firstWordWidth = rect ? rect.width : 0;

  if (VIVLIOSTYLE_DEBUG) {
    Logging.logger.debug(
      `[TorahWindow] First word "${firstWord}" + space width: ${firstWordWidth}px`,
    );
  }

  if (firstWordWidth <= 0) {
    return;
  }

  // Count the number of lines in the block
  const lineCount = countLines(blockElement, column);

  if (VIVLIOSTYLE_DEBUG) {
    Logging.logger.debug(`[TorahWindow] Block has ${lineCount} lines`);
  }

  // Need at least 2 lines for hanging indent to make sense
  if (lineCount < 2) {
    return;
  }

  const indentLines = lineCount === 3 ? 2 : 1;
  const floatIndent = applyHangingIndentStyle(
    blockElement,
    firstWordWidth,
    indentLines,
  );

  // Re-count after float insertion: the taller float can cause reflow that
  // adds an extra line. If that happened, shrink back to a single-line indent.
  // Track the effective line count so that text-align-last is based on the
  // actual rendered state after the float is applied.
  let effectiveLineCount = lineCount;
  if (indentLines > 1) {
    const actualLineCount = countLines(blockElement, column);
    if (actualLineCount > lineCount) {
      floatIndent.style.height = "1px";
      effectiveLineCount = actualLineCount;
      if (VIVLIOSTYLE_DEBUG) {
        Logging.logger.debug(
          `[TorahWindow] Reflow detected (${lineCount}→${actualLineCount} lines), shrinking indent to 1px`,
        );
      }
    }
  }

  // For 2- or 3-line centered paragraphs: right-align the last line.
  // Use effectiveLineCount so we don't mis-apply the rule when reflow
  // pushed the paragraph beyond 3 lines.
  if (effectiveLineCount === 2 || effectiveLineCount === 3) {
    const computedStyle =
      blockElement.ownerDocument?.defaultView?.getComputedStyle(blockElement);
    const isLastLineCentered =
      computedStyle?.textAlignLast === "center" &&
      computedStyle?.textAlign === "justify";
    if (isLastLineCentered) {
      blockElement.style.textAlignLast = "start";
      if (VIVLIOSTYLE_DEBUG) {
        Logging.logger.debug(
          `[TorahWindow] Applied text-align-last: start for ${effectiveLineCount}-line centered paragraph`,
        );
      }
    }
  }
}

/**
 * Find the first non-empty text node in an element
 */
function findFirstTextNode(element: Node): Text | null {
  if (element.nodeType === Node.TEXT_NODE) {
    const text = (element as Text).textContent || "";
    if (text.trim().length > 0) {
      return element as Text;
    }
    return null;
  }

  for (let i = 0; i < element.childNodes.length; i++) {
    const result = findFirstTextNode(element.childNodes[i]);
    if (result) {
      return result;
    }
  }

  return null;
}

/**
 * Count the number of lines in a block element
 */
function countLines(element: HTMLElement, column: Layout.Column): number {
  const textNodes = collectTextNodes(element);
  const lineYPositions = new Set<number>();

  for (const textNode of textNodes) {
    const range = textNode.ownerDocument.createRange();
    range.selectNodeContents(textNode);
    const rects = column.clientLayout.getRangeClientRects(range);

    for (const rect of rects) {
      // Round to avoid floating point precision issues
      const lineY = Math.round(rect.top);
      lineYPositions.add(lineY);
    }
  }

  return lineYPositions.size;
}

/**
 * Collect all non-empty text nodes in an element
 */
function collectTextNodes(element: Node): Text[] {
  const result: Text[] = [];

  function collect(node: Node): void {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node as Text).textContent || "";
      if (text.trim().length > 0) {
        result.push(node as Text);
      }
      return;
    }

    for (let i = 0; i < node.childNodes.length; i++) {
      collect(node.childNodes[i]);
    }
  }

  collect(element);
  return result;
}

function applyHangingIndentStyle(
  blockElement: HTMLElement,
  indentWidth: number,
  indentLines: number = 1,
): HTMLElement {
  const doc = blockElement.ownerDocument;
  const computedStyle = doc.defaultView?.getComputedStyle(blockElement);
  const lineHeight = computedStyle?.lineHeight || "1.2em";

  const floatSpacer = doc.createElement("div");
  floatSpacer.className = "vivliostyle-torah-window-spacer";
  floatSpacer.style.cssFloat = "inline-start";
  floatSpacer.style.width = "0";
  floatSpacer.style.height = `calc(${lineHeight} * 1.5)`;
  floatSpacer.style.lineHeight = lineHeight;

  const floatIndent = doc.createElement("div");
  floatIndent.className = "vivliostyle-torah-window-indent";
  floatIndent.style.cssFloat = "inline-start";
  floatIndent.style.clear = "inline-start";
  floatIndent.style.width = `${indentWidth}px`;
  floatIndent.style.height = indentLines > 1 ? lineHeight : "1px";

  const firstChild = blockElement.firstChild;
  blockElement.insertBefore(floatSpacer, firstChild);
  blockElement.insertBefore(floatIndent, firstChild);

  if (VIVLIOSTYLE_DEBUG) {
    Logging.logger.debug(
      `[TorahWindow] Applied two-float technique with indent width ${indentWidth}px`,
    );
  }

  return floatIndent;
}

/**
 * Initialize the plugin
 */
function init(): void {
  if (VIVLIOSTYLE_DEBUG) {
    Logging.logger.info("[TorahWindow] Initializing Torah Window plugin");
  }

  Plugin.registerHook(
    Plugin.HOOKS.PREPROCESS_ELEMENT_STYLE,
    preprocessElementStyle,
  );

  Plugin.registerHook(Plugin.HOOKS.POST_LAYOUT_BLOCK, postLayoutBlock);

  if (VIVLIOSTYLE_DEBUG) {
    Logging.logger.info("[TorahWindow] Plugin initialized");
  }
}

// Auto-initialize
init();
