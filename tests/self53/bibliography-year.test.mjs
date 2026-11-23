// The year on a bibliography line is a number that competes with other numbers.
//
// `parseBibEntries` used to take the *last* four-digit year-like token in the
// entry. That is right for the common case ("... In Proceedings of X, 2021.")
// and wrong for every other one, and the wrong ones are not rare: over 26,464
// entries parsed from the cached arXiv HTML, 1.2% got a year that cannot be
// right -- a page range ("pp. 2044–2056" -> 2056), an ISSN ("ISSN 1935-7524"
// -> 1935), a bracketed arXiv id ("[1905.08019]" -> 1905), or an access date
// ("[Accessed 14-11-2024]"). The r10 survey produced rows dated 2094 and 1901.
//
// The failure matters because one of our documents ranks whole directions by
// the median year of what they cite ("R3 is a 2019 field, the others are
// 2024-2025"), and that reading is only worth making if the year is the
// publication year rather than whichever number happened to come last.
import assert from 'node:assert/strict'
import { parseBibEntries } from '../../src/research/citegraph.js'

let passed = 0
let failed = 0
function ok(name) {
  passed++
  console.log(`ok ${passed + failed} - ${name}`)
}

function page(body) {
  return `<!DOCTYPE html><html><body>
<ul class="ltx_biblist">
<li id="bib.bib1" class="ltx_bibitem"><span class="ltx_tag ltx_role_refnum ltx_tag_bibitem">[1]</span> <span class="ltx_bibblock"> Alice A. </span> <span class="ltx_bibblock"> Alpha method. </span> <span class="ltx_bibblock"> ${body} </span></li>
</ul></body></html>`
}

// --- the four shapes that used to win the "last number" race ---------------

{
  const [entry] = parseBibEntries(page('Proceedings of the ACM on Programming Languages 9, OOPSLA2 (2025), 2002–2029.'))
  assert.equal(entry.year, 2025, `a page range must not become the year, got ${entry.year}`)
}
ok('a page range at the end of an entry is not its year')

{
  const [entry] = parseBibEntries(page('Electronic Journal of Statistics 18 (1). External Links: ISSN 1935-7524, Document.'))
  assert.equal(entry.year, null, `an ISSN is not a year, got ${entry.year}`)
}
ok('an ISSN is not a year, and an entry with no year says so instead of guessing')

{
  const [entry] = parseBibEntries(page('JHEP 07 (2019) 031 [1905.08019].'))
  assert.equal(entry.year, 2019, `a bracketed arXiv id is not a year, got ${entry.year}`)
}
ok('a bracketed arXiv id is not a year')

{
  const [entry] = parseBibEntries(page('https://github.com/crev-dev/crev . [Accessed 14-11-2024].'))
  assert.equal(entry.year, null, `an access date is not a publication year, got ${entry.year}`)
}
ok('an access date is not a publication year')

// --- and the shapes that must keep working --------------------------------

{
  const [entry] = parseBibEntries(page('In Proceedings of the 40th Conference, pages 1–9, 2021.'))
  assert.equal(entry.year, 2021, 'a trailing comma-year is still a year')
}
ok('the ordinary ", 2021." tail still reads as 2021')

{
  const [entry] = parseBibEntries(page('arXiv:2408.08435, 2024.'))
  assert.equal(entry.year, 2024, 'an id followed by the real year keeps the real year')
}
ok('an arXiv id does not shadow the year that follows it')

{
  // APA puts the year in parentheses right after the authors; when both a
  // parenthesised year and a later ", 2019." exist, the parenthesised one is
  // the publication year and the other is part of a title or a volume.
  const [entry] = parseBibEntries(page('(2019). Some title. Journal 3, 2020.'))
  assert.equal(entry.year, 2019, `the parenthesised year wins, got ${entry.year}`)
}
ok('a parenthesised year is preferred over a later bare one')

console.log(`# passed ${passed}, failed ${failed}`)
process.exit(failed === 0 ? 0 : 1)
