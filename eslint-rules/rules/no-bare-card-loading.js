/**
 * TER-1289 — terp/no-bare-card-loading
 *
 * Flags `<Card>` / `<CardContent>` elements whose FIRST non-whitespace child
 * is a bare `<Loader2 />` or `<Skeleton />`. Those loading surfaces should be
 * wrapped in `<OperationalStateSurface>` so the `loading / empty / error /
 * ready` contract is honored consistently.
 *
 * Does NOT fire on:
 *   - `<Loader2 />` inside a `<Button>` (mutation-pending pattern)
 *   - `<OperationalStateSurface>` itself
 *
 * Level: `warn` — will flip to `error` once the codemod cleans up existing
 * usages.
 */

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Discourage bare <Loader2 /> or <Skeleton /> inside <Card>/<CardContent>. " +
        "Wrap with <OperationalStateSurface> instead so loading/empty/error/ready states stay consistent.",
    },
    schema: [],
    messages: {
      bareLoading:
        "Bare <{{child}} /> inside <{{parent}}> — wrap with <OperationalStateSurface> so loading/empty/error/ready stay consistent.",
    },
  },

  create(context) {
    const CARD_PARENTS = new Set(["Card", "CardContent"]);
    const LOADING_CHILDREN = new Set(["Loader2", "Skeleton"]);

    function getElementName(el) {
      const name = el && el.openingElement && el.openingElement.name;
      if (!name) return null;
      // <Foo /> → JSXIdentifier
      if (name.type === "JSXIdentifier") return name.name;
      // <Foo.Bar /> → JSXMemberExpression (e.g. Card.Content)
      if (name.type === "JSXMemberExpression" && name.property) {
        return name.property.name;
      }
      return null;
    }

    return {
      JSXElement(node) {
        const parentName = getElementName(node);
        if (!parentName || !CARD_PARENTS.has(parentName)) return;

        // Find the first non-whitespace child.
        const firstChild = node.children.find((child) => {
          if (child.type === "JSXText") {
            return child.value.trim().length > 0;
          }
          if (child.type === "JSXExpressionContainer") {
            // Skip {/* comments */} only.
            return child.expression && child.expression.type !== "JSXEmptyExpression";
          }
          return true;
        });

        if (!firstChild || firstChild.type !== "JSXElement") return;

        const childName = getElementName(firstChild);
        if (!childName || !LOADING_CHILDREN.has(childName)) return;

        context.report({
          node: firstChild,
          messageId: "bareLoading",
          data: { parent: parentName, child: childName },
        });
      },
    };
  },
};

export default rule;
