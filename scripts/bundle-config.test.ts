import { expect, test } from "bun:test";
import { createRequire } from "node:module";
import path from "node:path";

// Verify the production alias selects React's own implementation, including
// escaping, SVG serialization and error handling, rather than a replacement.
test("the production server alias preserves the public static renderer", () => {
  const require = createRequire(
    path.resolve(import.meta.dirname, "../frontend/package.json"),
  );
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    const publicServer = require("react-dom/server.browser");
    const legacyServer = require(
      path.join(
        path.dirname(require.resolve("react-dom/package.json")),
        "cjs/react-dom-server-legacy.browser.production.js",
      ),
    );
    expect(legacyServer.renderToStaticMarkup).toBe(
      publicServer.renderToStaticMarkup,
    );
    expect(legacyServer.renderToString).toBe(publicServer.renderToString);
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});
