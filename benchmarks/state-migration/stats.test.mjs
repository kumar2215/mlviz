import { test } from "node:test";
import assert from "node:assert/strict";
import { quantile, pairedDifferenceCI } from "./stats.mjs";
import { regressionFixture, routesFor } from "./fixtures.mjs";

test("quantiles handle odd/even samples without mutating raw results", () => {
  const a = [5, 1, 3, 2];
  assert.equal(quantile(a, 0.5), 2.5);
  assert.equal(quantile([7, 1, 3], 0.5), 3);
  assert.deepEqual(a, [5, 1, 3, 2]);
  assert.throws(() => quantile([], 0.5));
});
test("paired interval preserves identical runs and a constant shift", () => {
  assert.deepEqual(pairedDifferenceCI([1, 3, 8], [1, 3, 8]), [0, 0]);
  assert.deepEqual(pairedDifferenceCI([1, 3, 8], [11, 13, 18]), [10, 10]);
  assert.throws(() => pairedDifferenceCI([1], [1, 2]));
});
test("both branch adapters serve identical model data", () => {
  const fixture = regressionFixture();
  assert.deepEqual(fixture, regressionFixture());
  assert.equal(fixture.points.length, 250);
  assert.equal(routesFor("context", fixture)["/api/linear/train"], routesFor("zustand", fixture)["/api/linear/train"]);
});
