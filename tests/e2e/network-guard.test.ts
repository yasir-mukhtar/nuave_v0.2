import { describe, expect, it } from "vitest";
import { unexpectedExternalRequests } from "./network-guard";

describe("unexpectedExternalRequests", () => {
  it("allows only loopback browser traffic", () => {
    expect(
      unexpectedExternalRequests([
        "http://localhost:3000/",
        "http://127.0.0.1:3000/_next/static/app.js",
      ]),
    ).toEqual([]);
  });

  it("rejects every third-party host, including the retired audit hero asset", () => {
    expect(
      unexpectedExternalRequests([
        "https://blume.codes/images/hero/fireflower/ff-0-sky-valley-new-standard-2x.webp",
        "https://api.openai.com/v1/responses",
        "https://framerusercontent.com/images/logo.svg",
      ]),
    ).toEqual([
      "https://blume.codes/images/hero/fireflower/ff-0-sky-valley-new-standard-2x.webp",
      "https://api.openai.com/v1/responses",
      "https://framerusercontent.com/images/logo.svg",
    ]);
  });
});
