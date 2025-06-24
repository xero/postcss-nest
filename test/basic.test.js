import { describe, it, expect } from "vitest";
import postcss from "postcss";
import nest from "../postcss-nest.js";

describe("postcss-nest", () => {
  it("unwraps nested selectors", async () => {
    const input = `
			.a { color: red; }
			.b { color: red; }
			.parent .a { font-weight: bold; }
			.parent .b { font-weight: bold; }
    `;
    const output = `
			.a, .b { color: red; }
			.parent {
			.a, .b { font-weight: bold; } }
    `.trim();
    const result = await postcss([nest()]).process(input, { from: undefined });
    expect(result.css.trim()).toBe(output);
  });
});
