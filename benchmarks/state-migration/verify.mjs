import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fixtures } from './suite-fixtures.mjs';
import { summarize, pairedDifferenceCI } from './stats.mjs';

const file = path.resolve(process.argv[2]);
const directory = path.dirname(file);
const gitRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const git = args => execFileSync('git', args, { cwd: gitRoot });
const report = JSON.parse(readFileSync(file, 'utf8'));
assert.equal(report.status, 'complete');
const selectors = report.options.comparison === 'selectors';
assert.equal(report.coverage.length, selectors ? 9 : 14);
assert.equal(report.coverage.filter(s => s.page).length, 9);
assert.equal(report.options.runs, 20);
assert.equal(report.options.warmups, 3);
assert.equal(report.options.steps, 40);
const expectedTrials = (report.options.runs + report.options.warmups) * 2 * report.coverage.reduce((n, s) => n + (s.page ? 2 : 1), 0);
assert.equal(report.trials.length, expectedTrials);
const measuredTrials = report.options.runs * 2 * report.coverage.reduce((n, s) => n + (s.page ? 2 : 1), 0);
assert.equal(report.trials.filter(t => !t.warmup).length, measuredTrials);
assert.equal(report.fixtureSha256, createHash('sha256').update(JSON.stringify(fixtures(report.options.points))).digest('hex'));
assert.equal(report.variants[0].sha, selectors ? 'bddf2967c3bf74ded9a88a2abc2924e914b97583' : 'a02cc25c307510a289f4ff06b34379f49fbbfc83');
assert.equal(report.variants[1].sha, selectors ? 'ac889ef39017e225dcc7884520df8b75919c83c0' : 'e2ead6e031e75d1d9ccaaa1acf2c1b2e1a52411b');
if (selectors) {
  assert.equal(report.scope.kind, 'selector-subscription-optimization');
  assert.equal(report.scope.changedFiles.length, 33);
  assert.equal(report.variants[0].lockSha256, report.variants[1].lockSha256);
  assert.equal(createHash('sha256').update(readFileSync(path.join(directory, 'revision-diff.patch'))).digest('hex'), report.scope.diffSha256);
  assert.deepEqual(JSON.parse(readFileSync(path.join(directory, 'baseline-registry.json'))), JSON.parse(readFileSync(path.join(directory, 'candidate-registry.json'))));
}
const unique = new Set();
for (const t of report.trials) {
  const key = [t.scenario, t.mode, t.variant, t.index].join(':');
  assert(!unique.has(key), 'Duplicate trial: ' + key); unique.add(key);
  assert.equal(t.warmup, t.index < 0);
  assert.equal(t.raw.inputs.events, 40);
  Object.values(t.metrics).forEach(v => assert(Number.isFinite(v) && v >= 0));
  assert(t.mode === 'production' ? t.raw.react === null : t.raw.react.samples.length > 0);
}
for (const s of report.coverage) for (const mode of ['production', 'profile']) {
  for (let i = -3; i < 20; i++) {
    const a = report.trials.find(t => t.scenario === s.id && t.mode === mode && t.variant === 'baseline' && t.index === i);
    assert(a, 'Missing baseline trial');
    const b = report.trials.find(t => t.scenario === s.id && t.mode === mode && t.variant === 'candidate' && t.index === i);
    if (s.page) {
      assert(b, 'Missing candidate trial');
      assert.deepEqual(a.initial, b.initial);
      assert.deepEqual(a.final, b.final);
      assert.equal(a.harnessSha256, b.harnessSha256);
    } else assert.equal(b, undefined);
  }
}
assert.equal(report.comparisons.length, selectors ? 91 : 138);
for (const c of report.comparisons) {
  const trials = variant => report.trials.filter(t => t.scenario === c.scenario && t.mode === c.mode && t.variant === variant && !t.warmup).sort((a, b) => a.index - b.index).map(t => t.metrics[c.metric]);
  assert.deepEqual(c.baseline, summarize(trials('baseline')));
  if (c.candidate) {
    assert.deepEqual(c.candidate, summarize(trials('candidate')));
    assert.deepEqual(c.candidateMinusBaseline95CI, pairedDifferenceCI(trials('baseline'), trials('candidate')));
    const reduction = c.baseline.median ? 100 * (c.baseline.median - c.candidate.median) / c.baseline.median : null;
    assert.equal(c.reductionPercent, reduction);
  }
  else assert.equal(trials('candidate').length, 0);
}
const sources = [];
for (const hash of readdirSync(path.join(directory, 'harness'))) {
  const root = path.join(directory, 'harness', hash);
  const names = ['suite.mjs', 'suite-fixtures.mjs', 'prepare.mjs', 'fixtures.mjs', 'stats.mjs', 'package-lock.json'];
  if (existsSync(path.join(root, 'checkpoint.mjs'))) names.push('checkpoint.mjs');
  assert.equal(createHash('sha256').update(names.map(name => readFileSync(path.join(root, name))).join('\n')).digest('hex'), hash);
  sources.push(readFileSync(path.join(root, 'suite.mjs'), 'utf8'));
  if (process.argv.includes('--staged')) {
    for (const name of names) {
      const relative = path.relative(gitRoot, path.join(root, name)).split(path.sep).join('/');
      assert.deepEqual(git(['show', ':' + relative]), readFileSync(path.join(root, name)), 'Git altered archive bytes');
    }
  }
}
for (const [start, end] of [
  ['    async function action(i)', '    if (!warmup && index === 0)'],
  ['    const requestStart = requests.length;', '    let final;'],
  ['    const metrics = {', '    return { scenario:'],
]) {
  const sections = sources.map(source => {
    const a = source.indexOf(start); assert(a >= 0);
    const b = source.indexOf(end, a); assert(b > a);
    return source.slice(a, b);
  });
  sections.forEach(section => assert.equal(section, sections[0], 'Timed code changed across recovery'));
}
assert.equal(new Set(report.trials.map(t => t.harnessSha256)).size, sources.length);
assert(existsSync(path.join(directory, 'summary.md')));
for (const s of report.coverage) for (const mode of ['production', 'profile']) for (const variant of s.page ? ['baseline', 'candidate'] : ['baseline']) for (const phase of ['before', 'after']) {
  const png = readFileSync(path.join(directory, [mode, s.id, variant, phase].join('-') + '.png'));
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(png.readUInt32BE(16), report.environment.viewport.width);
  assert.equal(png.readUInt32BE(20), report.environment.viewport.height);
}
if (process.argv.includes('--staged')) {
  const files = [];
  const collect = root => {
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      const file = path.join(root, entry.name);
      if (entry.isDirectory()) collect(file); else files.push(path.relative(gitRoot, file).split(path.sep).join('/'));
    }
  };
  collect(directory);
  const relativeDirectory = path.relative(gitRoot, directory).split(path.sep).join('/');
  const tracked = git(['ls-files', '--', relativeDirectory]).toString('utf8').trim().split('\n');
  assert.deepEqual(tracked.sort(), files.sort(), 'Some result files are not staged');
  assert.equal(files.filter(file => file.endsWith('.png') && !path.basename(file).startsWith('failure-')).length, report.coverage.reduce((n, s) => n + (s.page ? 2 : 1), 0) * 4);
  assert(!files.some(file => file.endsWith('.tmp')), 'Temporary checkpoint was staged');
  const staged = Object.fromEntries(git(['ls-files', '--stage', '--', relativeDirectory]).toString('utf8').trim().split('\n').map(line => {
    const [metadata, file] = line.split('\t');
    return [file, metadata.split(' ')[1]];
  }));
  const algorithm = git(['rev-parse', '--show-object-format']).toString('utf8').trim();
  for (const file of files) {
    const bytes = readFileSync(path.join(gitRoot, file));
    assert.equal(createHash(algorithm).update('blob ' + bytes.length + '\0').update(bytes).digest('hex'), staged[file], 'Git altered result bytes: ' + file);
  }
}
console.log(JSON.stringify({ valid: true, measuredTrials, warmups: report.trials.length - measuredTrials, modes: report.coverage.length, pairedModes: 9, harnessArchives: sources.length, comparisons: report.comparisons.length }));
