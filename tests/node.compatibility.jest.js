/**
 * Node.js compatibility tests using Jest
 * Converted from node.simple.test.js
 */

describe("Node.js Compatibility Tests", () => {
  test("Node.js runtime should be detected", () => {
    expect(process.version).toBeDefined();
    expect(process.version).toMatch(/^v\d+\.\d+\.\d+/);
  });

  test("Environment variable handling should work", () => {
    expect(process.env.PRINTERS_JS_SIMULATE).toBe("true");
  });

  test("Core Node.js modules should be accessible", () => {
    const fs = require("fs");
    const path = require("path");

    expect(typeof fs).toBe("object");
    expect(typeof path).toBe("object");
    expect(typeof fs.readFileSync).toBe("function");
    expect(typeof path.join).toBe("function");
  });
});
