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

  // TODO: Implement the actual hanging indent logic
  // This will be implemented after understanding the layout system better
  applyHangingIndent(blockElement, column);
};

/**
 * Apply hanging indent to a block element
 */
function applyHangingIndent(
  blockElement: HTMLElement,
  column: Layout.Column,
): void {
  // Find all text nodes to handle cases where first word is in a separate tag
  const allTextNodes = collectTextNodes(blockElement);
  if (allTextNodes.length === 0) {
    if (VIVLIOSTYLE_DEBUG) {
      Logging.logger.debug("[TorahWindow] No text nodes found in block");
    }
    return;
  }

  // Find the first word and trailing space, potentially across multiple text nodes
  const firstTextNode = allTextNodes[0];
  const text = firstTextNode.textContent || "";
  const firstWordMatch = text.match(/^(\s*)(\S+)(\s*)/);

  if (!firstWordMatch) {
    if (VIVLIOSTYLE_DEBUG) {
      Logging.logger.debug("[TorahWindow] No first word found");
    }
    return;
  }

  const leadingSpace = firstWordMatch[1];
  const firstWord = firstWordMatch[2];
  let trailingSpace = firstWordMatch[3];
  const firstWordWithSpaces = leadingSpace + firstWord + trailingSpace;

  const doc = blockElement.ownerDocument;
  const range = doc.createRange();
  range.setStart(firstTextNode, 0);

  // Check if we have trailing space in the first text node
  if (trailingSpace.length > 0) {
    // Simple case: everything is in the first text node
    range.setEnd(firstTextNode, firstWordWithSpaces.length);
  } else {
    // Complex case: first word might be in a tag, need to include space from next text node
    range.setEnd(firstTextNode, firstWordWithSpaces.length);

    // Look for trailing space in the next text node
    if (allTextNodes.length > 1) {
      const nextTextNode = allTextNodes[1];
      const nextText = nextTextNode.textContent || "";
      const nextSpaceMatch = nextText.match(/^(\s+)/);

      if (nextSpaceMatch) {
        // Extend the range to include the space from the next text node
        range.setEnd(nextTextNode, nextSpaceMatch[1].length);
        trailingSpace = nextSpaceMatch[1];

        if (VIVLIOSTYLE_DEBUG) {
          Logging.logger.debug(
            `[TorahWindow] Found trailing space in next text node: "${trailingSpace}"`,
          );
        }
      }
    }
  }

  const rects = column.clientLayout.getRangeClientRects(range);
  let firstWordWidth = 0;
  for (const rect of rects) {
    firstWordWidth += rect.width;
  }

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

  // Apply the hanging indent
  applyHangingIndentStyle(blockElement, firstWordWidth);
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
): void {
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
  floatIndent.style.height = "1px";

  const firstChild = blockElement.firstChild;
  blockElement.insertBefore(floatSpacer, firstChild);
  blockElement.insertBefore(floatIndent, firstChild);

  if (VIVLIOSTYLE_DEBUG) {
    Logging.logger.debug(
      `[TorahWindow] Applied two-float technique with indent width ${indentWidth}px`,
    );
  }
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
