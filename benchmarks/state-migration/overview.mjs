import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const file = path.resolve(process.argv[2]);
const report = JSON.parse(readFileSync(file, 'utf8'));
assert.equal(report.status, 'complete');
assert.equal(report.options.comparison, 'selectors');
const comparison = (scenario, mode, metric) => report.comparisons.find(c => c.scenario === scenario && c.mode === mode && c.metric === metric);
const direction = c => c.candidateMinusBaseline95CI[1] < 0 ? 'lower' : c.candidateMinusBaseline95CI[0] > 0 ? 'higher' : 'uncertain';
const cell = c => {
  if (!c) return 'n/a';
  const change = c.reductionPercent === null ? '' : `; ${Math.abs(c.reductionPercent).toFixed(1)}% ${c.reductionPercent > 0 ? 'less' : 'more'}`;
  return `${c.baseline.median.toFixed(2)} → ${c.candidate.median.toFixed(2)}${change}; ${direction(c)}`;
};
const measured = report.trials.filter(t => !t.warmup);
const directional = (mode, metric) => report.comparisons.filter(c => c.mode === mode && c.metric === metric && direction(c) !== 'uncertain');
const taskChanges = directional('production', 'taskMs');
const scriptChanges = directional('production', 'scriptMs');
const layoutChanges = directional('production', 'layoutMs');
const reactChanges = directional('profile', 'reactTotalMs');
const describe = c => `${c.scenario}: ${Math.abs(c.reductionPercent).toFixed(1)}% ${c.reductionPercent > 0 ? 'less' : 'more'}`;
const lines = [
  '# Broad versus selective Zustand subscriptions', '',
  `Baseline: \`${report.variants[0].sha}\`; candidate: \`${report.variants[1].sha}\`.`, '',
  `All ${report.coverage.length} shared visualization scenarios were compared in ordinary production and separate React profiling builds. Each scenario/build has ${report.options.runs} measured pairs and ${report.options.warmups} warm-up pairs, with ${report.options.steps} real UI actions and ${report.options.points} fixture points per trial: ${measured.length} measured trials in total.`, '',
  'The audited change is the subscription optimization package: field selectors, shallow comparison of derived arrays, and reactive mode subscriptions. Store implementations, D3 renderers, dependencies, public configuration and backend are identical. Both revisions already use Zustand; this comparison does not measure Context versus Zustand.', '',
  'Values below are baseline → candidate medians. Lower/higher means the paired bootstrap 95% difference interval excludes zero; uncertain means it crosses zero. Percentages compare median work. Intervals are exploratory and have no multiple-comparison correction.', '',
  taskChanges.length || scriptChanges.length
    ? `Directional production task changes: ${taskChanges.map(describe).join('; ') || 'none'}. Script changes: ${scriptChanges.map(describe).join('; ') || 'none'}.`
    : 'None of the nine scenarios established a direction for total main-thread task time or script time at the reported confidence level. This does not establish that the costs are equal.', '',
  `Directional React-duration changes: ${reactChanges.map(describe).join('; ') || 'none'}. Directional layout-duration changes: ${layoutChanges.map(describe).join('; ') || 'none'}. All remaining React-duration and layout-duration intervals cross zero.`, '',
  '## Browser work in ordinary production builds', '',
  'Times are totals in milliseconds across the entire workload, including automation and sampling overhead. They are not latency per click.', '',
  '| Scenario | Main-thread task | Script | Layout | Style |',
  '|---|---|---|---|---|',
];
for (const s of report.coverage) lines.push(`| ${s.id} | ${['taskMs', 'scriptMs', 'layoutMs', 'styleMs'].map(metric => cell(comparison(s.id, 'production', metric))).join(' | ')} |`);
lines.push('', '## React work in separate profiling builds', '',
  'React duration excludes D3 effects. Counts are component function invocations, not DOM mutations. HUD counts aggregate mounted model HUDs. Fractional counts are medians; n/a means the component was absent.', '',
  '| Scenario | React render ms | Commits | Results renders | Visualization renders | HUD renders |',
  '|---|---|---|---|---|---|');
for (const s of report.coverage) {
  const cells = ['reactTotalMs', 'reactCommits', 'resultsRenders', 'visualisationRenders', 'hudRenders'].map(metric => {
    const probe = { resultsRenders: 'results', visualisationRenders: 'visualisation', hudRenders: 'hud' }[metric];
    const trials = measured.filter(t => t.scenario === s.id && t.mode === 'profile');
    return probe && trials.every(t => !t.raw.react.seen[probe]) ? 'n/a' : cell(comparison(s.id, 'profile', metric));
  });
  lines.push(`| ${s.id} | ${cells.join(' | ')} |`);
}
lines.push('', '## Supplemental rendering-opportunity estimate', '',
  'Milliseconds from input capture to rAF followed by a timer, measured only for synchronous controls. This is not actual paint latency, INP, FPS, or evidence that users can notice a difference. Training and prediction have no latency estimate here.', '',
  '| Scenario | P50 ms | P95 ms |', '|---|---|---|');
for (const s of report.coverage) if (comparison(s.id, 'production', 'renderOpportunityP50Ms')) lines.push(`| ${s.id} | ${cell(comparison(s.id, 'production', 'renderOpportunityP50Ms'))} | ${cell(comparison(s.id, 'production', 'renderOpportunityP95Ms'))} |`);
lines.push('', '## Evidence and limits', '',
  'API responses are fixed local fixtures. These tests measure frontend work; backend computation and real network latency are excluded. Each mode uses its documented representative action, rather than every possible interaction. Five historical modes had already been removed from both revisions.', '',
  'Paired trials match their workload values and final outcomes. Success-alert timers run normally during repeated training/prediction; their phase is not frozen. Alert visibility can differ in screenshots, and those timers can contribute extra React commits. Interpret commit counts as observed workload counts, rather than a fixed number of store notifications.', '',
  'The [full report](summary.md) includes interquartile ranges and numerical confidence intervals for every metric. [Raw trials and environment](raw.json), before/after screenshots, exact registries, the audited revision diff, and archived harness sources accompany it. Results are intended to be tracked in Git; caches and smoke runs remain ignored.', '');
writeFileSync(path.join(path.dirname(file), 'overview.md'), lines.join('\n'));
console.log(JSON.stringify({ overview: path.join(path.dirname(file), 'overview.md'), measuredTrials: measured.length, scenarios: report.coverage.length }));
