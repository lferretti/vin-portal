// @ts-check
"use strict";

/**
 * ESLint rule: no-form-input-modifier
 *
 * Prevents combining `form-input` with typography-override Tailwind utilities.
 * When a form element uses `form-input`, its font-family, font-size, and
 * letter-spacing are owned by the design system class in `src/styles.css`.
 * Overriding them inline leads to visual inconsistency.
 *
 * See `src/app/shared/CLAUDE.md` for the full design-system vocabulary.
 */

const FORBIDDEN_PATTERNS = [
  // Font family
  /\bfont-mono\b/,
  /\bfont-sans\b/,
  /\bfont-serif\b/,
  /\bfont-display\b/,
  /\bfont-body\b/,
  // Font size
  /\btext-xs\b/,
  /\btext-sm\b/,
  /\btext-base\b/,
  /\btext-lg\b/,
  /\btext-xl\b/,
  /\btext-2xl\b/,
  // Letter spacing
  /\btracking-tight\b/,
  /\btracking-normal\b/,
  /\btracking-wide\b/,
  /\btracking-wider\b/,
  /\btracking-widest\b/,
];

/** @param {string} value */
function findViolation(value) {
  if (!value.includes("form-input")) return null;
  // Ensure "form-input" is a standalone class token (not "form-input-error")
  if (!/(?:^|\s)form-input(?:\s|$)/.test(value)) return null;

  for (const pattern of FORBIDDEN_PATTERNS) {
    const match = value.match(pattern);
    if (match) return match[0];
  }
  return null;
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow typography-override utilities on elements using `form-input`",
    },
    messages: {
      noModifier:
        'Do not combine "form-input" with "{{modifier}}". ' +
        "Typography on form-input is owned by the design system. " +
        "See src/app/shared/CLAUDE.md for alternatives.",
    },
    schema: [],
  },

  create(context) {
    return {
      // Matches class="..." in inline templates (template literals)
      TemplateElement(node) {
        const raw = node.value.raw;
        if (!raw.includes("form-input")) return;

        // Extract class attribute values from the template string
        const classRegex = /class="([^"]+)"/g;
        let classMatch;
        while ((classMatch = classRegex.exec(raw)) !== null) {
          const modifier = findViolation(classMatch[1]);
          if (modifier) {
            context.report({
              node,
              messageId: "noModifier",
              data: { modifier },
            });
          }
        }
      },

      // Also check plain string Literal nodes (e.g. class bindings)
      Literal(node) {
        if (typeof node.value !== "string") return;
        const modifier = findViolation(node.value);
        if (modifier) {
          context.report({
            node,
            messageId: "noModifier",
            data: { modifier },
          });
        }
      },
    };
  },
};
