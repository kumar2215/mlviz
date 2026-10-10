import { test } from "node:test";
import assert from "node:assert/strict";
import { quantile, pairedDifferenceCI } from "./stats.mjs";
import { regressionFixture, routesFor } from "./fixtures.mjs";
import { fixtures, scenarios, suiteRoutes } from './suite-fixtures.mjs';
import { writeCheckpoint } from './checkpoint.mjs';
import { readFileSync, mkdirSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

test('atomic checkpoints replace an existing file on the local filesystem', () => {
  mkdirSync(new URL('./.cache/', import.meta.url), { recursive: true });
  const file = fileURLToPath(new URL('./.cache/checkpoint-test-' + process.pid + '.json', import.meta.url));
  try {
    writeCheckpoint(file, { trials: [1] });
    writeCheckpoint(file, { trials: [1, 2] });
    assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), { trials: [1, 2] });
  } finally { unlinkSync(file); }
});

test('checkpoint retries transient Windows locks without overwriting the complete destination', () => {
  const writes = [], replacements = [], pauses = [];
  let attempts = 0;
  writeCheckpoint('raw.json', { status: 'running', trials: [1, 2] }, {
    write(file, contents) { writes.push([file, JSON.parse(contents)]); },
    rename(from, to) {
      if (++attempts < 3) throw Object.assign(new Error('locked'), { code: 'UNKNOWN' });
      replacements.push([from, to]);
    },
    pause(ms) { pauses.push(ms); },
  });
  assert.equal(writes.length, 3);
  assert(writes.every(([file]) => file !== 'raw.json'));
  assert.deepEqual(replacements, [[writes[0][0], 'raw.json']]);
  assert.deepEqual(pauses, [100, 200]);
  assert.throws(() => writeCheckpoint('raw.json', {}, {
    write() { throw Object.assign(new Error('disk full'), { code: 'ENOSPC' }); },
    pause() { assert.fail('Nontransient errors must not retry'); },
  }), /disk full/);
});

test("quantiles handle odd/even samples without mutating raw results", () => {
  const a = [5, 1, 3, 2];
  assert.equal(quantile(a, 0.5), 2.5);
  assert.equal(quantile([7, 1, 3], 0.5), 3);
  assert.deepEqual(a, [5, 1, 3, 2]);
  assert.throws(() => quantile([], 0.5));
});

test('suite fixtures preserve dataset size, histogram totals, and split partitions', () => {
  for (const count of [101, 250]) {
    const data = fixtures(count);
    assert.deepEqual(data, fixtures(count));
    assert.equal(data.knn.training_points.length, count);
    assert.equal(data.svm.points.length, count);
    assert.equal(data.kmeans.data_points.length, count);
    assert.equal(Object.values(data.featureStats.histogram_data.counts_by_class).flat().reduce((s, n) => s + n, 0), count);
    for (const t of data.featureStats.thresholds) {
      const partition = [...t.left_samples_mask, ...t.right_samples_mask].sort((a, b) => a - b);
      assert.deepEqual(partition, Array.from({ length: count }, (_, i) => i));
      assert(t.information_gain >= 0 && t.information_gain <= 0.5);
    }
  }
});

test('suite adapters use identical model fixtures and predictions follow submitted queries', () => {
  const data = fixtures(250);
  assert.equal(scenarios.length, 14);
  assert.equal(scenarios.filter(s => s.page).length, 9);
  for (const s of scenarios) {
    const a = suiteRoutes('context', s, data), b = suiteRoutes('zustand', s, data);
    for (const p of ['/api/knn/train', '/api/linear/train', '/api/svm/train']) assert.deepEqual(a[p], b[p]);
    assert.deepEqual(a['/api/kmeans/train']({ centroids: [] }), b['/api/kmeans/train']({ centroids: [] }));
    assert.equal(a['/api/knn/predict']({ query_points: [[-1, 0]] }).prediction_indices[0], 0);
    assert.equal(b['/api/knn/predict']({ query_points: [[1, 0]] }).prediction_indices[0], 1);
    assert.equal(a['/api/dt/predict']({ points: { x: 1 } }).predicted_class_index, 1);
  }
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
