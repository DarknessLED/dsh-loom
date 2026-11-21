# Third-party notices

dsh-loom is MIT-licensed (see `LICENSE`). The parts listed here were written by
other people and are reproduced, ported, or adapted with the licences below.
Nothing in this file is an endorsement by those authors of how the code is used
here.

## dsh-deep-research 0.1.1 (MIT)

- Author: houdinicc
- Package: `dsh-deep-research` on the npm registry
- Source of the ported code: `lib/research.js`, `lib/plan.js`
- Licence text: MIT (permissive; modification and redistribution allowed with
  attribution)

What was ported into `src/research/plan.js` and `src/research/fetch.js`:

- the `quick` / `standard` / `deep` depth presets and the query-plan shape
  (`planQueries`, `resolveLimits`);
- URL identity (`normalizeUrl`, `domainOf`) including the tracking-parameter
  strip list;
- rotating merge of multi-query search results with dedupe by normalised URL
  (`mergeSearchResults`) and per-host fetch spreading (`selectFetchTargets`);
- HTML→text conversion, token/term extraction (Latin stopwords, CJK bigrams),
  passage splitting and scoring (`htmlToText`, `extractTerms`,
  `splitPassageBlocks`, `extractPassages`);
- the second-round follow-up query rule (`buildFollowupQueries`).

What was **not** ported: its provider plumbing, its tool surface, its store and
its panel client. Those are not needed here — this plugin talks to the host's
own `web` service and keeps its own ledgers.

## Awesome-Gaussian-Skills (Apache-2.0)

- Repository: `jaccen/Awesome-Gaussian-Skills`
- Source of the method: `skills/3dgs-paper-reader/SKILL.md`,
  `skills/3dgs-paper-reader/references/evidence-workflow.md`,
  `skills/research-expert-team/SKILL.md`, `skills/_contracts/paper-evidence.schema.json`

What was borrowed is the *discipline*, not the 3DGS domain knowledge, and it
lives in `src/research/note.js` (and the `note` action of `rsi_research`):

- three declared reading depths (metadata / abstract / full) with the rule that
  a mechanism, evaluation, ablation or reproducibility claim cannot come from an
  abstract;
- identity locking — a title alone is a candidate, not a record; an access
  "identifier that resolves" only proves the record exists;
- every claim typed (author claim / literature statement / measurement /
  reader inference / hypothesis / proposal) and located (page, section, table);
- a delta must be taken from two cells under the same protocol and subtracted
  explicitly;
- gaps recorded with their scope.

Apache-2.0 requires attribution and a copy of the licence for redistributed
derivative work; the rules above were re-expressed as code and prose here rather
than copied verbatim, and this notice records where they came from.

## dsh-research-report 0.4.2 (Apache-2.0)

The four-file ledger layout used by `src/research/ledger.js`
(`blobs/`, `index.jsonl`, `claims.jsonl`, `verdicts.jsonl`) follows the shape of
this plugin's evidence store so the two can read each other. No code was copied;
the format is the borrowed part.
