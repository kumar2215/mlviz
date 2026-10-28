# Controlled model-state migration experiment

Baseline: Context model state at `3bee6f351a810b6d6ff847a3c29e2378a5925ca6`.
Candidate: uncommitted source based on migration commit `5da4d3f1adcc42761a35531e819fdb3f1c090275`, identified by the complete SHA-256 manifest in `candidate-snapshot.json`. The candidate is not the unchanged migration commit.

The candidate retains the five model stores and replaces whole-model subscriptions with field selectors and shallow comparison for derived arrays/objects. The existing app/story/dataset/config store usage is unchanged on both sides. Model Context consumers and providers are replaced by store consumers plus lifecycle components.

The bundled zoom-centering change, decision-tree visualization-wrapper rewrite, train-initialization changes, SVM loss-map guard/dependency rewrite, and shared-app-store cleanup are removed. Original passive persistence, immediate reset cleanup, auto-load policies, and model-data synchronization effects are retained. Loss-map callbacks retain the old data dependencies despite stable store-action identities. D3 renderers, wrappers, dependencies, assets and public configuration are identical. The manifest verifies 54 protected files and reconstructs every candidate source file from the baseline plus the complete file changes.

Both benchmark builds strip console log/debug/info expression statements, including argument evaluation. Both substitute benchmark title/favicon and local API/config fixtures. React probes and the profiling React DOM bundle are used only in the separate profiling build. These are controlled benchmark builds, not untouched deployments of the two source revisions.

This tests the optimized migration implementation, including its update scheduling, derived-state mechanics and subscriptions. It is not a universal library-only comparison. Zustand store lifetime differs from a mounted Context provider; every trial uses a fresh browser context and a single model route. It does not test cross-model navigation or all possible interactions.

All nine shared registered visualization scenarios are covered in both builds: 20 measured and 3 warm-up pairs each, 40 actions and 250 fixture points per trial. Five handover-era modes had already been removed from both revisions and cannot be paired here. Frontend update costs are measured with fixed local responses; backend and real network latency are excluded. Browser work totals include automation overhead. React duration excludes D3 effects. Rendering-opportunity delays are not actual paint latency, INP or perceived speed. Confidence intervals are exploratory and have no multiplicity correction.

## Evidence

- `overview.md`: readable tables for all production, React and rendering-opportunity metrics.
- `summary.md`: medians, interquartile ranges and paired confidence intervals for every comparison.
- `raw.json`: every retained trial and environment metadata.
- `verification.json`: independently checked trial, state, request, source and statistics evidence.
- `migration-only.patch`: complete readable baseline-to-candidate patch, including the files that were untracked during the experiment.
- `candidate-changes.json`: authoritative complete changed-file bytes in base64; null means delete. Together with the baseline and `candidate-snapshot.json`, this recreates and hashes all 205 candidate source files.
- `candidate-tracked.patch`: supplementary original Git diff; it omits untracked files and must not be used by itself to reconstruct the candidate.
- `harness/`: exact measured harness versions. The startup readiness fix is recorded in the run audit; timed actions and metric code did not change. The failed startup checkpoint and screenshot are retained.
- `analysis/`: verifier, overview generator, fixture/statistics checks and source-preparation helpers. TypeScript logs contain one identical pre-existing unused-import error on each side.
- 72 normal before/after screenshots; the primary model SVG geometry is also hashed and matched outside the timed windows. This checks geometry and controls, not pixel-perfect equality of every HUD or alert.

## Reproduce without checking out or committing the experiment

From the repository root, run `python <this-result-directory>/reproduce.py`. It reconstructs the candidate and harness in ignored benchmark caches, verifies every source hash, and prints the exact npm command. It leaves the current checkout unchanged. It requires this repository's baseline Git object and the recorded Node/Chrome/Playwright environment for the closest replication. New measurements will vary.

Verify the retained results with `node <this-result-directory>/analysis/verify.mjs <this-result-directory>/raw.json`. Run the seven fixture/statistics/checkpoint checks with `node --test <this-result-directory>/analysis/stats.test.mjs`.

The temporary application edits are discarded and the original `test-benchmark` checkout is restored after the experiment. No commit is created. These result artifacts are deliberately left uncommitted and are not ignored.
