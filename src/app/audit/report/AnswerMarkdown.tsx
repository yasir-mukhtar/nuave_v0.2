import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "./report-body.module.css";

// Small structural view of mdast: no new parser/plugin dependency. Transform
// resource-bearing constructs to text before remark-rehype can emit elements.
type Node = {
  type: string;
  children?: Node[];
  value?: string;
  url?: string;
  title?: string | null;
  identifier?: string;
  checked?: boolean | null;
  depth?: number;
  position?: { start: { offset?: number }; end: { offset?: number } };
};
function inertEvidenceMarkdown() {
  return (tree: Node, file: { value: unknown }) => {
    const raw = String(file.value);
    const definitions = new Map<string, string>();
    for (const node of tree.children ?? []) {
      if (node.type === "definition" && node.identifier && node.url)
        definitions.set(node.identifier.toUpperCase(), node.url);
    }
    const literal = (node: Node): Node => {
      if (!node.position) return { type: "text", value: node.value ?? "" };
      return {
        type: "text",
        value: raw.slice(node.position.start.offset, node.position.end.offset),
      };
    };
    function transform(node: Node, root = false): Node[] {
      if (
        [
          "html",
          "image",
          "imageReference",
          "definition",
          "footnoteReference",
          "footnoteDefinition",
        ].includes(node.type)
      ) {
        const text = literal(node);
        return node.type.endsWith("Definition") ||
          node.type === "definition" ||
          (root && node.type === "html")
          ? [{ type: "paragraph", children: [text] }]
          : [text];
      }
      if (node.children)
        node.children = node.children.flatMap((child) => transform(child));
      if (node.type === "link" || node.type === "linkReference") {
        const destination =
          node.url ?? definitions.get(node.identifier?.toUpperCase() ?? "");
        if (!destination) return [literal(node)];
        const children = node.children ?? [];
        const label = children.map((child) => child.value ?? "").join("");
        return [
          ...children,
          ...(label === destination
            ? []
            : [{ type: "text", value: ` (${destination})` }]),
          ...(node.title ? [{ type: "text", value: ` — ${node.title}` }] : []),
        ];
      }
      if (node.type === "heading")
        node.depth = Math.min(6, (node.depth ?? 1) + 3);
      if (node.type === "listItem" && typeof node.checked === "boolean") {
        const marker: Node = {
          type: "text",
          value: node.checked ? "[x] " : "[ ] ",
        };
        if (node.children?.[0]?.type === "paragraph")
          node.children[0].children?.unshift(marker);
        else node.children?.unshift({ type: "paragraph", children: [marker] });
        node.checked = null;
      }
      return [node];
    }
    tree.children = tree.children?.flatMap((node) => transform(node, true));
  };
}

const allowedElements = [
  "p",
  "h4",
  "h5",
  "h6",
  "em",
  "strong",
  "del",
  "ul",
  "ol",
  "li",
  "blockquote",
  "pre",
  "code",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "br",
  "hr",
];

export function AnswerMarkdown({ raw }: { raw: string }) {
  return (
    <div className={styles.markdown} data-answer-body>
      <Markdown
        remarkPlugins={[remarkGfm, inertEvidenceMarkdown]}
        allowedElements={allowedElements}
        unwrapDisallowed
        components={{
          table: ({ children }) => (
            <div
              className={styles.tableScroll}
              role="region"
              aria-label="Tabel dalam jawaban model AI"
              tabIndex={0}
            >
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {raw}
      </Markdown>
    </div>
  );
}
