// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AnswerMarkdown } from "./AnswerMarkdown";

afterEach(cleanup);

const marks = (root: ParentNode) =>
  [...root.querySelectorAll("mark")].map((mark) => mark.textContent);

describe("AnswerMarkdown names (J33 marks)", () => {
  it("marks the business's names in paragraphs without changing the words", () => {
    const raw =
      "Kedai Fiksi buka sampai malam. Coba **kedai fiksi** atau KF di Dago.\n\n- Daftar: Kedai Fiksi, Kopi Lain";
    const { container } = render(
      <AnswerMarkdown raw={raw} names={["Kedai Fiksi", "KF"]} />,
    );
    const paragraph = container.querySelector("p")!;
    expect(paragraph.textContent).toBe(
      "Kedai Fiksi buka sampai malam. Coba kedai fiksi atau KF di Dago.",
    );
    expect(marks(paragraph)).toEqual(["Kedai Fiksi", "kedai fiksi"]);
    expect(paragraph.querySelector("strong > mark")).toHaveTextContent(
      "kedai fiksi",
    );
    expect(container.querySelector("li")!.textContent).toBe(
      "Daftar: Kedai Fiksi, Kopi Lain",
    );
    expect(marks(container.querySelector("li")!)).toEqual(["Kedai Fiksi"]);
  });

  it("leaves text exactly as written when no name is given", () => {
    const raw = "Kedai Fiksi buka sampai malam.";
    const { container } = render(<AnswerMarkdown raw={raw} />);
    expect(container.querySelector("mark")).toBeNull();
    expect(container.querySelector("p")!.textContent).toBe(raw);
  });

  it("marks nothing inside code", () => {
    const raw =
      "Lihat `Kedai Fiksi` di sini.\n\n```\nKedai Fiksi buka 24 jam\n```\n\nKedai Fiksi juga.";
    const { container } = render(
      <AnswerMarkdown raw={raw} names={["Kedai Fiksi"]} />,
    );
    for (const code of container.querySelectorAll("code, pre"))
      expect(code.querySelector("mark")).toBeNull();
    expect(container.querySelector("pre")!.textContent).toBe(
      "Kedai Fiksi buka 24 jam\n",
    );
    expect(marks(container)).toEqual(["Kedai Fiksi"]);
    expect(container.querySelectorAll("p")[1]!.textContent).toBe(
      "Kedai Fiksi juga.",
    );
  });

  it("never marks a name inside a longer word", () => {
    const raw = "Fiksional bukan Fiksi; FiksiKu juga bukan. Fiksi2 pun tidak.";
    const { container } = render(
      <AnswerMarkdown raw={raw} names={["Fiksi"]} />,
    );
    expect(marks(container)).toEqual(["Fiksi"]);
    expect(container.querySelector("p")!.textContent).toBe(raw);
  });

  it("marks the longest name once and skips names too short to tell apart", () => {
    const raw = "Kedai Fiksi Dago ramai, Kedai lain sepi. Ya.";
    const { container } = render(
      <AnswerMarkdown raw={raw} names={["Kedai", "Kedai Fiksi Dago", "Ya"]} />,
    );
    expect(marks(container)).toEqual(["Kedai Fiksi Dago", "Kedai"]);
    expect(container.querySelector("p")!.textContent).toBe(raw);
  });
});
