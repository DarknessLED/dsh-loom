import { extractClaims, screenClaim, screenClaims, buildImaginePrompt } from '../src/lean/imagine.js'

let passed = 0
let failed = 0
function ok(cond, name) {
  if (cond) {
    passed += 1
    console.log(`ok ${passed} - ${name}`)
  } else {
    failed += 1
    console.error(`not ok ${passed + failed} - ${name}`)
  }
}
const eq = (a, b, name) => ok(Object.is(a, b) || JSON.stringify(a) === JSON.stringify(b), `${name} (got ${JSON.stringify(a)})`)

// ---------------------------------------------------------------- extraction
{
  const text = 'I think these matter:\n```lean\ntheorem inv_step : ∀ n, f (n+1) = f n + 1\ntheorem sound : True\n```\nand maybe `theorem inline : 1 = 1` is not extracted'
  const claims = extractClaims(text)
  eq(claims.length, 2, 'extract: only statements inside the lean block')
  ok(claims[0].includes('inv_step'), 'extract: statement kept verbatim')

  eq(extractClaims('```lean\nlemma a : P\n```')[0], 'lemma a : P', 'extract: lemma accepted')
  eq(extractClaims('no claims here').length, 0, 'extract: nothing found is not an error')

  const bare = extractClaims('theorem t1 : P\ntheorem t2 : Q')
  eq(bare.length, 2, 'extract: bare lines count when there is no fence')
}

// ------------------------------------------------------------------ screening
{
  eq(screenClaim('').reason, 'empty', 'screen: empty claim rejected')
  eq(screenClaim('this is prose').reason, 'not-a-claim', 'screen: prose rejected')
  eq(screenClaim('theorem t : False := by sorry').reason, 'placeholder-in-claim', 'screen: sorry rejected before the compiler')
  eq(screenClaim('theorem t : True').reason, 'trivial', 'screen: True rejected as trivial')
  eq(screenClaim('theorem t : 1 = 1').reason, 'trivial', 'screen: 1 = 1 rejected')
  eq(screenClaim('theorem t : P').ok, true, 'screen: a real statement passes')
  eq(screenClaim('theorem t : P').name, 't', 'screen: name captured')
  eq(screenClaim(`theorem t : ${'x'.repeat(500)}`).reason, 'too-long', 'screen: absurd length rejected')
}

{
  const claims = ['theorem a : P', 'theorem b : True', 'theorem a : P', 'theorem c : Q', 'theorem d : R']
  const r = screenClaims(claims, { max: 2 })
  eq(r.accepted.length, 2, 'screenClaims: respects the budget')
  eq(r.accepted[0].name, 'a', 'screenClaims: keeps order')
  ok(r.rejected.some((x) => x.reason === 'duplicate'), 'screenClaims: duplicates rejected')
  ok(r.rejected.some((x) => x.reason === 'over-budget'), 'screenClaims: budget overflow is explicit')

  const seen = screenClaims(['theorem a : P'], { seen: ['theorem a : P'] })
  eq(seen.accepted.length, 0, 'screenClaims: already-proven claims are not re-proposed')
  eq(seen.rejected[0].reason, 'duplicate', 'screenClaims: dedupe against history')
}

// --------------------------------------------------------------------- brief
{
  const prompt = buildImaginePrompt({ task: { prompt: 'make the parser linear' }, maxClaims: 2 })
  ok(prompt.includes('make the parser linear'), 'brief: task quoted')
  ok(prompt.includes('at most 2'), 'brief: budget stated')
  ok(prompt.includes('no proof'), 'brief: forbids proving here')
  ok(buildImaginePrompt({}).includes('(missing)'), 'brief: missing task does not throw')
}

console.log(`\n${passed}/${passed + failed} passed`)
if (failed) process.exitCode = 1
