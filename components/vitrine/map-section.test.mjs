import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the storefront CSP allows the Google Maps iframe origin", async () => {
  const mapSection = await readFile(
    new URL("./sections/map-section.tsx", import.meta.url),
    "utf8",
  );
  const nextConfig = await readFile(
    new URL("../../next.config.ts", import.meta.url),
    "utf8",
  );

  assert.match(mapSection, /https:\/\/www\.google\.com\/maps/);

  const frameSrc = nextConfig.match(/`frame-src ([^`]+)`/)?.[1];
  assert.ok(frameSrc, "next.config.ts must define an explicit frame-src directive");
  assert.match(
    frameSrc,
    /https:\/\/www\.google\.com(?:\s|$)/,
    "frame-src must allow the exact origin used by MapSection",
  );
});
