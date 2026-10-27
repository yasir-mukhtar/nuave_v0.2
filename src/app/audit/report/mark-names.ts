/**
 * A rehype step that wraps the business's own names in `<mark>` inside an
 * answer, so the owner finds them fast (J33). It only adds marks around the
 * observed text; the words themselves are never changed. Code stays as it is.
 */
import { findNames } from "@/lib/audit/find-names";

export { findNames, type NameMatch } from "@/lib/audit/find-names";

type HastNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

export function markNames(names: readonly string[]) {
  return () => (tree: HastNode) => {
    const split = (text: string): HastNode[] => {
      const parts: HastNode[] = [];
      let last = 0;
      for (const { start, end } of findNames(text, names)) {
        if (start > last)
          parts.push({ type: "text", value: text.slice(last, start) });
        parts.push({
          type: "element",
          tagName: "mark",
          properties: {},
          children: [{ type: "text", value: text.slice(start, end) }],
        });
        last = end;
      }
      if (!parts.length) return [{ type: "text", value: text }];
      if (last < text.length)
        parts.push({ type: "text", value: text.slice(last) });
      return parts;
    };
    const visit = (node: HastNode) => {
      if (!node.children) return;
      node.children = node.children.flatMap((child) => {
        if (child.type === "element") {
          if (child.tagName !== "code" && child.tagName !== "pre") visit(child);
          return [child];
        }
        return child.type === "text" && child.value
          ? split(child.value)
          : [child];
      });
    };
    visit(tree);
  };
}
