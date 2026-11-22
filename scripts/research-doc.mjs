#!/usr/bin/env node
// Turn a survey into the document a reader can check.
//
// The survey is machine output: what search returned, what the bibliographies
// cited, which works several papers compared against. The reading is mine: what
// those numbers mean for this plugin, and what the survey still cannot answer.
// Keeping them in separate files is the point — a generator that also wrote the
// conclusions would make the conclusions look as mechanical as the counts.
//
//   node scripts/research-doc.mjs [slug ...] [--out docs/research]
//
// Reads  research/out/<slug>.survey.{json,md}
//        directions/<slug>.reading.md   (optional, written by hand)
// Writes docs/research/<slug>-survey-<date>.md

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, isAbsolute, join } from 'node:path'

// `--root` exists so a spec can point the generator at a fixture directory. The
// alternative was a spec that imports the module and re-implements the file
// layout, which would let the two drift apart.
const rootFlag = process.argv.indexOf('--root')
const ROOT = rootFlag >= 0 ? process.argv.splice(rootFlag, 2)[1] : process.cwd()
const args = process.argv.slice(2)
const outFlag = args.indexOf('--out')
const rawOut = outFlag >= 0 ? args.splice(outFlag, 2)[1] : 'docs/research'
const only = args.filter((a) => !a.startsWith('-'))

const today = new Date().toISOString().slice(0, 10)

function readIf(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : null
}

// The direction file is optional input: a survey can exist for a direction
// whose config was renamed. Missing or malformed means "no hand-written
// queries to compare against", not a crash in the middle of rendering.
function readJson(path) {
  const text = readIf(path)
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function table(rows, header) {
  if (!rows.length) return '_（本次语料里没有达到门槛的条目）_'
  return [header, '| --- | --- | --- | --- | --- |', ...rows].join('\n')
}

function foundationRows(cls, limit = 15) {
  return (cls.foundations ?? []).slice(0, limit).map((f) => {
    const w = f.work ?? f
    return `| ${w.citedByPapers ?? '—'} | ${w.totalCites ?? '—'} | ${w.year ?? '—'} | ${w.title ?? '—'} | ${w.arxivId ? `[${w.arxivId}](https://arxiv.org/abs/${w.arxivId})` : '—'} |`
  })
}

function comparedRows(cls, limit = 10) {
  return (cls.compared ?? []).slice(0, limit).map((f) => {
    const w = f.work ?? f
    return `| ${w.totalCites ?? '—'} | ${w.citedByPapers ?? '—'} | ${w.year ?? '—'} | ${w.title ?? '—'} | ${w.arxivId ? `[${w.arxivId}](https://arxiv.org/abs/${w.arxivId})` : '—'} |`
  })
}

function openingLines(cls) {
  const rows = (cls.openings ?? []).slice(0, 12)
  if (!rows.length) return '_（没有可识别的细分方向：查询词没有把语料切开）_'
  return rows
    .map((o) => `- **${o.cluster}** — 语料内 ${o.count} 篇，最早 ${o.paper?.date ?? '—'}：${o.paper?.title ?? '—'}${o.paper?.id ? ` · [arXiv:${o.paper.id}](https://arxiv.org/abs/${o.paper.id})` : ''}`)
    .join('\n')
}

function sotaLines(cls) {
  const rows = (cls.sota ?? []).slice(0, 12)
  if (!rows.length) return '_（语料里没有足够新的条目）_'
  return rows
    .map((s) => `- ${s.paper?.date ?? '—'} · ${s.paper?.title ?? '—'}${s.paper?.id ? ` · [arXiv:${s.paper.id}](https://arxiv.org/abs/${s.paper.id})` : ''}`)
    .join('\n')
}

function gapLines(cls, works) {
  // The gap list is not stored in the survey: it is "cited at least twice and
  // never returned by search", which is a question about the merge, not about
  // any one cluster. Computing it here keeps the rule in one place.
  const rows = (works ?? []).filter((w) => !w.inCorpus && w.citedByPapers >= 2).slice(0, 12)
  if (!rows.length) return '_（没有常引却缺席的工作：这一轮的回溯覆盖到了搜索能到的地方）_'
  return rows
    .map((g) => `- ${g.citedByPapers ?? '—'} 篇引 · ${g.year ?? '—'} · ${g.title ?? '—'}${g.arxivId ? ` · [arXiv:${g.arxivId}](https://arxiv.org/abs/${g.arxivId})` : ''}`)
    .join('\n')
}

const outDir = isAbsolute(rawOut) ? rawOut : join(ROOT, rawOut)

const files = only.length
  ? only
  : readdirSync(join(ROOT, 'research/out'))
      .filter((f) => f.endsWith('.survey.json'))
      .map((f) => basename(f, '.survey.json'))

mkdirSync(outDir, { recursive: true })

const written = []
for (const slug of files) {
  const raw = readIf(join(ROOT, 'research/out', `${slug}.survey.json`))
  if (!raw) {
    console.error(`[${slug}] no survey — run scripts/research-survey.mjs first`)
    continue
  }
  const r = JSON.parse(raw)
  const cls = r.cls ?? {}
  const reading = readIf(join(ROOT, 'directions', `${slug}.reading.md`))
  const traced = (r.traces ?? []).length
  const unreadable = (r.failures ?? []).length
  const works = (r.agg?.works ?? []).length
  const foundationCount = (cls.foundations ?? []).length
  const comparedCount = (cls.compared ?? []).length
  const allWorks = r.agg?.works ?? []
  const gapCount = allWorks.filter((w) => !w.inCorpus && w.citedByPapers >= 2).length
  // Runs include the --gaps second pass, whose queries are gap titles rather
  // than hand-written ones. Counting only the direction file would hide the
  // pass that found the most, so the table names both numbers - but only when
  // the direction file is still there to compare against. Without it every run
  // would look like a backfill, which is a claim the file cannot support.
  const directionFile = readJson(join(ROOT, 'directions', `${slug}.json`))
  const askedSet = directionFile
    ? new Set((directionFile.queries ?? []).map((q) => (typeof q === 'string' ? q : q.q)))
    : null
  const allRuns = r.b?.runs ?? []
  const asked = askedSet ? allRuns.filter((x) => askedSet.has(x.query)).length : 0
  const backfilled = askedSet ? allRuns.filter((x) => !askedSet.has(x.query)).length : 0
  const queries = allRuns.filter((x) => x.status === 'ok').length
  const emptyQueries = allRuns.filter((x) => x.status === 'ok' && x.returned === 0).length

  const lines = []
  lines.push(`# ${r.direction?.name ?? slug}`)
  lines.push('')
  lines.push(`> 自动生成于 ${today}，来源 \`research/out/${slug}.survey.json\`。数字全部由脚本算出，结论段是人写的，两者用 \`---\` 分开。`)
  lines.push('')
  lines.push('## 这一轮读了什么')
  lines.push('')
  lines.push('| 项 | 数量 |')
  lines.push('| --- | --- |')
  const split = askedSet ? `${asked} 条手写 + ${backfilled} 条回填；` : '方向文件不在，分不出手写与回填；'
  lines.push(`| 成功查询 | ${queries} 条（${split}其中 ${emptyQueries} 条返回 0 结果）|`)
  lines.push(`| 不同候选 | ${r.b?.candidates ?? '—'} |`)
  lines.push(`| 保留候选 | ${(r.b?.papers ?? []).length} |`)
  lines.push(`| 读通全文 | ${traced} 篇${unreadable ? `（${unreadable} 篇无可用 HTML）` : ''} |`)
  lines.push(`| 参考文献条目 | ${r.referenceCount ?? '—'} 条引用 |`)
  lines.push(`| 语料内被至少两篇引的工作 | ${works} 个 |`)
  lines.push(`| 达到基石门槛 | ${foundationCount} |`)
  lines.push(`| 被反复对比的基线 | ${comparedCount} |`)
  lines.push(`| 常引但本轮缺席 | ${gapCount} |`)
  lines.push('')
  lines.push('**怎么读这张表。** "被几篇引"只统计本语料内读通全文的那些论文的参考文献，不是全领域被引数——arXiv 全文 HTML 只覆盖较新的、有 LaTeXML 渲染的论文，而全领域引用图需要 OpenAlex/Semantic Scholar 的额度（这一轮用完了）。所以表里的数字回答的是"这个方向在近期论文里被反复提起什么"，不是"这个领域最重要的工作是什么"。')
  lines.push('')
  lines.push('## 基石：本方向多篇论文都在引')
  lines.push('')
  lines.push(table(foundationRows(cls), '| 被几篇引 | 篇内累计 | 年 | 工作 | arXiv |'))
  lines.push('')
  lines.push('## 反复被对比的基线（单篇内被多次引用）')
  lines.push('')
  lines.push(table(comparedRows(cls), '| 篇内引用 | 被几篇引 | 年 | 工作 | arXiv |'))
  lines.push('')
  lines.push('## 各细分方向的开篇（按语料内最早一篇）')
  lines.push('')
  lines.push(openingLines(cls))
  lines.push('')
  lines.push('**开篇不等于首创。** 这是"本语料里最早"的一篇，语料是按 2023 年后的查询抓的，真正的 2011–2020 开篇要么在 gap 表里（搜索没返回过它），要么根本没被渲染成 HTML。')
  lines.push('')
  lines.push('## 最近的 SOTA（近两年，按语料）')
  lines.push('')
  lines.push(sotaLines(cls))
  lines.push('')
  lines.push('## 被常引但不在语料里（下一轮的查询）')
  lines.push('')
  lines.push(gapLines(cls, allWorks))
  lines.push('')
  if (reading) {
    lines.push('---')
    lines.push('')
    lines.push(reading.trim())
    lines.push('')
  } else {
    lines.push('---')
    lines.push('')
    lines.push('_（这一份还没有人写的结论段：`directions/' + slug + '.reading.md` 缺失。只有计数、没有判断，不要把它当结论用。）_')
    lines.push('')
  }
  lines.push('## 复算')
  lines.push('')
  lines.push('```')
  lines.push(`node scripts/research-survey.mjs directions/${slug}.json --resume --gaps 8`)
  lines.push(`node scripts/research-doc.mjs ${slug}`)
  lines.push('```')
  lines.push('')
  lines.push('缓存命中的部分不会重新请求网络；换机器要从头抓，数字会变，因为 arXiv 的搜索结果本身随时间变化。')
  lines.push('')

  // `-survey-` keeps these apart from the sealed-claim reports for the same
  // direction: one is what search and bibliographies said, the other is what a
  // handful of read papers claimed and had verified byte by byte.
  const target = join(outDir, `${slug}-survey-${today}.md`)
  writeFileSync(target, lines.join('\n'), 'utf8')
  written.push(target)
}

for (const f of written) console.log(`wrote ${f}`)
if (!written.length) process.exit(2)
