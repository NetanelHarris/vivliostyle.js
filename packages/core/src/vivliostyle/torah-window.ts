/**
 * Torah Window Plugin
 *
 * Implements "hanging indent" typography style used in Torah/religious books:
 * The second line of a paragraph is indented by the width of the first word + space.
 *
 * Usage in CSS:
 *   p { hanging-indent: first-word; }
 */

import * as Css from "./css";
import * as Logging from "./logging";
import * as Plugin from "./plugin";
import type * as Vtree from "./vtree";
import type * as Layout from "./layout";

// Property name constant
const HANGING_INDENT_PROP = "hanging-indent";

// Identifier for the "first-word" value
const FIRST_WORD_VALUE = Css.getName("first-word");
const NONE_VALUE = Css.getName("none");

/**
 * Hook 1: PREPROCESS_ELEMENT_STYLE
 * Stores the hanging-indent value in nodeContext for later use
 */
const preprocessElementStyleHook: Plugin.PreProcessElementStyleHook = (
  nodeContext: Vtree.NodeContext,
  style: object,
) => {
  const styleObj = style as any;

  if (styleObj[HANGING_INDENT_PROP]) {
    const value = styleObj[HANGING_INDENT_PROP];
    let stringValue: string;

    if (value instanceof Css.Ident) {
      stringValue = value.name;
    } else if (typeof value === "string") {
      stringValue = value;
    } else {
      stringValue = value.toString();
    }

    Logging.logger.info(
      `[TorahWindow] PREPROCESS_ELEMENT_STYLE: Setting hanging-indent to ${stringValue} on ${nodeContext.sourceNode?.nodeName}`,
    );

    nodeContext.inheritedProps = nodeContext.inheritedProps || {};
    nodeContext.inheritedProps[HANGING_INDENT_PROP] = stringValue;
  }
};

/**
 * Hook 2: POST_LAYOUT_BLOCK
 * Applies the hanging indent after block layout is complete
 */
const postLayoutBlockHangingIndent: Plugin.PostLayoutBlockHook = (
  nodeContext: Vtree.NodeContext,
  checkPoints: Vtree.NodeContext[],
  column: Layout.Column,
) => {
  Logging.logger.info(
    `[TorahWindow] POST_LAYOUT_BLOCK called for ${nodeContext.viewNode?.nodeName}, inline: ${nodeContext.inline}, checkPoints: ${checkPoints.length}`,
  );

  // Skip if no checkpoints
  if (!nodeContext || checkPoints.length === 0) {
    return;
  }

  // Only process block-level elements
  if (nodeContext.inline) {
    return;
  }

  // Skip fragments that are not the first fragment
  if (nodeContext.fragmentIndex > 1) {
    return;
  }

  // Check if this block has hanging-indent: first-word
  const inheritedProps = nodeContext.inheritedProps;
  const cssProps = nodeContext.pluginProps;
  Logging.logger.info(
    `[TorahWindow] Inherited properties: ${
      inheritedProps ? Object.keys(inheritedProps).join(", ") : "none"
    }`,
  );
  Logging.logger.info(
    `[TorahWindow] Plugin properties: ${
      cssProps ? Object.keys(cssProps).join(", ") : "none"
    }`,
  );
  if (!inheritedProps) {
    return;
  }

  const hangingIndentValue = inheritedProps[HANGING_INDENT_PROP];
  if (!hangingIndentValue) {
    return;
  }

  Logging.logger.info(
    `[TorahWindow] Found hanging-indent property with value: ${hangingIndentValue}`,
  );

  if (hangingIndentValue !== "first-word") {
    return;
  }

  Logging.logger.info(
    `[TorahWindow] Applying hanging-indent to block element: ${nodeContext.viewNode?.nodeName}`,
  );

  // Get the block element
  const blockElement = nodeContext.viewNode as HTMLElement;
  if (!blockElement) {
    Logging.logger.warn(`[TorahWindow] No block element found`);
    return;
  }

  // Find the first text node to measure
  // We need to search through the DOM tree, not just checkPoints
  let firstTextNode: Text | null = null;
  let firstWordWidth = 0;

  // Helper function to find first text node recursively
  function findFirstTextNode(node: Node): Text | null {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node as Text).textContent || "";
      if (text.trim().length > 0) {
        return node as Text;
      }
      return null;
    }

    for (let i = 0; i < node.childNodes.length; i++) {
      const result = findFirstTextNode(node.childNodes[i]);
      if (result) {
        return result;
      }
    }
    return null;
  }

  firstTextNode = findFirstTextNode(blockElement);
  if (firstTextNode) {
    const text = firstTextNode.textContent || "";
    // Measure the first word + space
    const match = text.match(/^(\s*\S+\s+)/);
    if (match) {
      const firstWordWithSpace = match[1];
      const doc = firstTextNode.ownerDocument;
      const range = doc.createRange();
      range.setStart(firstTextNode, 0);
      range.setEnd(firstTextNode, firstWordWithSpace.length);
      const rects = column.clientLayout.getRangeClientRects(range);
      for (const rect of rects) {
        firstWordWidth += rect.width;
      }
      Logging.logger.info(
        `[TorahWindow] Measured first word "${firstWordWithSpace.trim()}" width: ${firstWordWidth}px`,
      );
    }
  }

  if (!firstTextNode || firstWordWidth === 0) {
    Logging.logger.info(
      `[TorahWindow] No valid first word found or width is 0`,
    );
    return;
  }

  // Count lines in the block by measuring all text nodes
  const lineYPositions = new Set<number>();

  // Helper function to collect all text nodes recursively
  function collectTextNodes(node: Node, textNodes: Text[]): void {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node as Text).textContent || "";
      if (text.trim().length > 0) {
        textNodes.push(node as Text);
      }
      return;
    }

    for (let i = 0; i < node.childNodes.length; i++) {
      collectTextNodes(node.childNodes[i], textNodes);
    }
  }

  const textNodes: Text[] = [];
  collectTextNodes(blockElement, textNodes);

  for (const textNode of textNodes) {
    const range = textNode.ownerDocument.createRange();
    range.selectNode(textNode);
    const rects = column.clientLayout.getRangeClientRects(range);

    for (const rect of rects) {
      const lineY = Math.round(rect.top);
      lineYPositions.add(lineY);
    }
  }

  const lineCount = lineYPositions.size;
  Logging.logger.info(`[TorahWindow] Found ${lineCount} lines in block`);

  // Need at least 2 lines
  if (lineCount < 2) {
    Logging.logger.info(
      `[TorahWindow] Only ${lineCount} line(s), not applying hanging indent`,
    );
    return;
  }

  // Create two float elements to create the hanging indent effect
  const doc = blockElement.ownerDocument;

  // Element 1: Float with 0 width and 2lh height
  // This "reserves" space for 2 lines but doesn't push text (width: 0)
  const floatSpacer = doc.createElement("span");
  floatSpacer.className = "vivliostyle-hanging-indent-spacer";
  floatSpacer.style.cssFloat = "inline-start";
  floatSpacer.style.width = "0";
  floatSpacer.style.height = "1.5rlh";
  floatSpacer.style.lineHeight = "inherit";

  // Element 2: Float with the measured width and 1px height
  // This creates the actual indentation on the second line
  const floatIndent = doc.createElement("span");
  floatIndent.className = "vivliostyle-hanging-indent-pusher";
  floatIndent.style.cssFloat = "inline-start";
  floatIndent.style.clear = "inline-start";
  floatIndent.style.width = `${firstWordWidth}px`;
  floatIndent.style.height = "1px";

  // Insert both elements at the beginning of the block
  const firstChild = blockElement.firstChild;
  blockElement.insertBefore(floatSpacer, firstChild);
  blockElement.insertBefore(floatIndent, firstChild);

  Logging.logger.info(
    `[TorahWindow] Applied hanging indent: ${firstWordWidth}px, ${lineCount} lines`,
  );

  // Store in plugin props for debugging
  if (!nodeContext.pluginProps) {
    nodeContext.pluginProps = {};
  }
  nodeContext.pluginProps["torahWindow:applied"] = 1;
  nodeContext.pluginProps["torahWindow:width"] = firstWordWidth;
  nodeContext.pluginProps["torahWindow:lineCount"] = lineCount;
};

/**
 * Initialize the plugin by registering hooks
 */
export function init(): void {
  Logging.logger.info("[TorahWindow] Initializing Torah Window plugin");

  Plugin.registerHook(
    Plugin.HOOKS.PREPROCESS_ELEMENT_STYLE,
    preprocessElementStyleHook,
  );

  Plugin.registerHook(
    Plugin.HOOKS.POST_LAYOUT_BLOCK,
    postLayoutBlockHangingIndent,
  );

  Logging.logger.info("[TorahWindow] Plugin initialized successfully");
}

// Auto-initialize
init();
