import json, os

T = "w8-attention"
P = "w8-attention-"

def n(slug, kind, title, body, source, confidence, tags):
    return {
        "id": P + slug,
        "kind": kind,
        "title": title,
        "body": " ".join(body.split()),
        "source": source,
        "confidence": confidence,
        "topic": T,
        "tags": tags,
    }

NODES = []

NODES.append(n(
    "queue-is-the-product", "analysis",
    "The overnight loop's human interface is a 114-item queue of 6,684 changed lines",
    '''The measured promotion queue is 6,684 changed lines across 114 patches (exp-human-007). Treat that as the interface's actual input: a supervisor waking at 06:00 faces 114 independent patch decisions, about 59 changed lines per decision. Two mechanisms follow. First, at any plausible dwell budget the human cannot inspect 114 items at line level, so the effective decision is triage, not review. Second, the loop's own scoring is binary (exp-score-001) and minGain never changed a decision (exp-gate-001), so the queue cannot be pre-sorted by quality margin: every item looks equally "passed". Falsifiable prediction: an interface that caps the morning queue at K items and defers the rest will lower defect escape rate per reviewed patch relative to a 114-item flat list at equal total review minutes, because triage effort is reallocated to items the human can actually inspect.''',
    "exp-human-007; exp-score-001; exp-gate-001 (ledger)", "high", ["queue", "triage", "ledger"]))

NODES.append(n(
    "green-check-information-content", "claim",
    "A green check from this verifier carries almost no information: 89 of 94 verifiers already pass on the clean base tree",
    '''Two ledger measurements combine into a hard claim about what the human sees. The median task verifier is 3 assertions and all 94 tasks together are 348 assertions (exp-ver-001); 89 of 94 task verifiers pass on the clean base tree (exp-ver-003). So the visible "verified" badge is produced by something like three assertions, and for 95% of tasks those same assertions pass without any change at all. The badge therefore discriminates a patch from the empty patch, not a good patch from a bad one. Mechanism: a check's information content is the probability it fails on a broken tree, and a test that passes on the base tree cannot distinguish "fixed" from "untouched". Falsifiable prediction: adding a mutation check - revert one line of the patch and require the verifier to fail - will reject a measurable fraction of currently-green patches; without it the badge should be rendered as "ran 3 assertions", never as "verified".''',
    "exp-ver-001; exp-ver-003 (ledger)", "high", ["verifier", "information", "ledger"]))

NODES.append(n(
    "checks-pass-not-evidence", "claim",
    "In a controlled coding-agent study the mandatory pre-merge check did not function as evidence: 39% of silent defects were caught",
    '''Dissanayake et al. (arXiv:2610.27801v1) ran a within-subject study, N=36, over 6 short Python tasks with 214 usable outcomes, seeding 71 silent-defect tasks into an agentic coding workflow. Participants resolved 28 of 71 (39%). 65 of 71 (91.5%) did perform at least one evaluative action beyond the mandatory pre-merge check, but only 40 of those actions were task-relevant, and of the 35 that produced defect-revealing evidence, 5 still did not recognize it. So the failure is not "nobody looked"; it is that the sanctioned check was generic and the human treated its passing as the evidence. Mechanism: a check that is always run and almost always passes becomes a ritual, and ritual completion substitutes for verification. Falsifiable prediction: removing the always-green check and replacing it with one task-specific assertion raises catch rate above 39% at equal time on task.''',
    "arXiv:2610.27801", "high", ["oversight", "pre-merge-check", "ritual"]))

NODES.append(n(
    "catch-rate-varies-8-to-75", "number",
    "Silent-defect catch rate ranged 8% to 75% across six task types, and 79% of misses were rated 4 or 5 out of 5",
    '''Per-task catch rates in arXiv:2610.27801 Appendix C Table 5: CONFLICTS 1/12 = 8%, ATTENDANCE 3/12 = 25%, EQUIPMENT 4/12 = 33%, TAGS 6/12 = 50%, WAITLIST 5/11 = 45%, BILLING 9/12 = 75%. Mean confidence overall was 4.13/5. Among the 43 missed silent-defect tasks with valid ratings, 34 (79%) were rated 4 or 5. Recognized defects took M=10.8 min versus M=5.8 min for missed (Mann-Whitney p<.001), and confidence did not track that difference. Mechanism: confidence is a property of the human's prior, not of the evidence inspected, so it cannot be used to route review. Falsifiable prediction: an interface that asks for a confidence rating collects 4s and 5s on tasks the human has not inspected, and sorting the queue by self-reported confidence does not reduce defect escape.''',
    "arXiv:2610.27801", "high", ["detection", "confidence", "defects"]))

NODES.append(n(
    "dwell-marker", "number",
    "The only behavioral marker separating catching from missing was time without typing: .622 vs .425 (d=1.29)",
    '''From arXiv:2610.27801: proportion of task time with no input activity was .622 on resolved silent-defect tasks versus .425 on missed ones, p<.001, Cohen's d=1.29 - the largest and most stable signal in the study. Keystroke rate, deletion counts, and cursor travel/speed did not distinguish outcomes. Gaze measures failed: pooled fixation and saccade rates differed but did not persist within participants, and fixation rate reversed direction (+7.39/min on resolved, p=.008); the authors conclude "gaze dynamics did not provide a reliable task-level marker". Physiological signals (heart-rate variability, respiration) did not distinguish conditions or outcomes. Mechanism: reading-and-thinking shows up as absence of typing, so dwell-without-input is a cheap proxy for inspection. Falsifiable prediction: a per-item dwell timer flagging approvals made with under 20% idle time catches more unexamined approvals than a confidence prompt, at zero sensor cost.''',
    "arXiv:2610.27801", "high", ["telemetry", "dwell", "behavioral-marker"]))

NODES.append(n(
    "confidence-does-not-recalibrate", "claim",
    "Absolute confidence did not recalibrate across rounds (4.17 to 4.09, n.s.) but relative thoroughness did track detection",
    '''arXiv:2610.27801 reports mean confidence on silent-defect tasks moving from 4.17 in round 1 to 4.09 in round 2, not significant, even after participants saw their round-1 results; 79% of misses were still rated 4-5/5. However a within-person measure did work: perceived thoroughness relative to one's own norm was 4.14 on caught tasks versus 3.49 on missed, and among the 16 participants who caught one and missed one, the caught task scored 0.93 points higher (p=.023). Mechanism: an absolute rating has no reference class, while a comparative judgement ("more or less careful than usual") does. Design consequence: ask the human to compare this item to their own baseline, or derive the comparison from dwell, but never trust a 1-5 absolute confidence field as a signal about inspection.''',
    "arXiv:2610.27801", "high", ["self-report", "calibration", "survey"]))

NODES.append(n(
    "explanation-raises-acceptance", "claim",
    "Explanations raised acceptance and subjective usefulness without raising team accuracy: 1,626 users, three tasks, no significant gain",
    '''Bansal et al., CHI 2021 (arXiv:2006.14779, DOI 10.1145/3411764.3445717), 1,626 participants over three tasks. Team accuracy with confidence only was already complementary (Beer 0.89 +/- 0.05 versus AI 0.84 and human 0.82). Adding explanations did not significantly improve it: Explain-Top-1 versus confidence-only gave Beer z=-1.18 p=.24, Amzbook z=1.23 p=.22, LSAT z=0.427 p=.64; adaptive explanation also failed (p=.31, .28, .87). Subjective usefulness rose anyway: 70% versus 57% (Beer), 65% versus 49% (Amzbook), 63% versus 45% (LSAT) rated the AI useful. Mechanism: a rationale is evidence of competence independent of its validity, so it moves approval, not accuracy. Falsifiable prediction: attaching a generated rationale to each queued patch raises approval rate while audited defect rate stays flat.''',
    "arXiv:2006.14779", "high", ["explanation", "trust", "acceptance"]))

NODES.append(n(
    "explanation-error-split", "analysis",
    "Explanations helped only where the human had independent ground truth: +5% when the AI was wrong on book reviews, negative on beer and LSAT",
    '''The mechanism inside arXiv:2006.14779 is an error split. When the AI was correct, explaining its top prediction helped; when the AI was wrong it hurt - except on Amazon book reviews, where Explain-Top-1 beat confidence-only by 5% on exactly the AI-wrong items, because participants could read the review and judge for themselves, and learned to distrust. On Beer and LSAT the same explanation decreased performance on AI-wrong items. So the value of a rationale is conditional on the human's ability to falsify it from the artifact. This applies directly to a code-patch queue: the human can falsify a claim about code by reading the diff (ground truth available), but cannot falsify a claim about whether the task was the right task. Design consequence: explain the diff, not the intent, and spend explanation budget where independent access exists.''',
    "arXiv:2006.14779", "medium", ["explanation", "ground-truth", "conditions"]))

NODES.append(n(
    "uncertainty-format", "claim",
    "Calibrated probability alone changed nothing; calibrated probability in frequency format let people adjust reliance",
    '''Cao, Liu, Huang (arXiv:2401.05612, PACM HCI 8, DOI 10.1145/3637318) ran a four-condition between-subjects study on skin-cancer screening, 15 trials, AI correct 12/15, with the participant's initial decision and 0-100 confidence collected before the AI suggestion. Conditions: no uncertainty, raw probability, calibrated probability, calibrated frequency. Result: showing calibrated model uncertainty alone was no better than uncalibrated confidence; only calibration combined with frequency framing let participants adjust reliance appropriately and reduced the confirmation-bias effect. Frequency wording used verbatim: "In 100 samples like this, AI would predict 72 to be benign, and 51 out of the 72 would actually be benign." Prior work they cite agrees: model confidence often has little effect (Bussone 2015; Rechkemmer and Yin 2022), and frequency format improved trust calibration without improving accuracy (Zhang 2020).''',
    "arXiv:2401.05612", "high", ["uncertainty", "format", "reliance"]))

NODES.append(n(
    "dotplot-payoff", "number",
    "Quantile dotplots produced decisions worth 97% of optimal, 5 percentage points better than control",
    '''Fernandes, Walls, Munson, Hullman, Kay, CHI 2018 (DOI 10.1145/3173574.3173718) tested uncertainty displays for transit decisions. Decisions made with quantile dotplots (50 dots representing 50 outcomes) had expected payoffs at 97% of the optimal choice, 95% CI [95%, 98%] - 5 percentage points above control, 95% CI [2, 8]. Within-subject SD was 3 pp, 95% CI [2, 4], which is 4 pp less than control, 95% CI [2, 6]: the display made decisions both better and more consistent. Joslyn and LeClerc (J Exp Psychol Applied 18(1):126-140, 2012, DOI 10.1037/a0025185) found the same direction for numeric uncertainty forecasts: better precautionary decisions and preserved credibility after forecast misses. Mechanism: discrete outcome counts let a person simulate the decision instead of converting a probability, which is the step that fails. Falsifiable prediction: replacing a "confidence: 0.8" field with a 10-dot outcome strip raises the rate at which a supervisor picks the safer of two patches.''',
    "DOI 10.1145/3173574.3173718; DOI 10.1037/a0025185", "high", ["uncertainty", "dotplot", "decision-quality"]))

NODES.append(n(
    "uncertainty-defers-question", "question",
    "Open: does showing uncertainty make a supervisor defer more, or does any claim of competence do that?",
    '''The evidence does not support the common worry that uncertainty displays cause deference; it supports a sharper claim. Lai and Tan 2019 (cited in arXiv:2401.05612) found that presenting AI accuracy increases reliance even when the stated accuracy is chance; Bansal et al. 2021 found explanations raise acceptance regardless of correctness; Cao et al. found uncertainty presentation alone changes nothing. So the driver looks like "the system asserted something about itself", not "the system admitted doubt". What remains unmeasured: no study we found measures deference as a function of uncertainty display in a queue setting where the human has many items and limited time, and none measures whether an uncertainty display changes the decision to skip an item rather than the decision to approve it. Falsifiable test: same 60 patches, three arms (no uncertainty, calibrated frequency, dotplot), measure approve/skip/defer rates and audited defect rate.''',
    "arXiv:2401.05612; arXiv:2006.14779", "medium", ["open-question", "uncertainty", "deference"]))

NODES.append(n(
    "forcing-function-tradeoff", "claim",
    "The interventions that cut overreliance were the ones participants liked and trusted least (N=199)",
    '''Bucinca, Malaya, Gajos (PACM HCI 5 CSCW1, DOI 10.1145/3449287, arXiv:2102.09692), N=199 on MTurk, compared three cognitive forcing designs (on-demand explanation, decide-before-seeing-AI, forced delay) against two simple-XAI conditions and a no-AI baseline. Cognitive forcing significantly reduced overreliance on incorrect AI recommendations; it did not eliminate it. The load-bearing finding for interface design: participants gave the least favourable subjective ratings to exactly the conditions that reduced overreliance most - people over-relied less on the AI when exposed to conditions they found more difficult, preferred less, and trusted less. Benefits were also uneven: high need-for-cognition participants gained more, so the intervention widened the gap. Design consequence for an overnight loop: any friction that works will be rated worse than a smooth approve button, so friction has to be mandatory rather than a preference.''',
    "arXiv:2102.09692", "high", ["friction", "overreliance", "preference-gap"]))

NODES.append(n(
    "batching-three-windows", "number",
    "Hourly batching changed nothing; three batches a day reduced stress and raised well-being; alerts fully off raised anxiety",
    '''Fitz, Kushlev, Jagannathan, Lewis, Paliwal, Ariely, "Batching smartphone notifications can improve well-being", Computers in Human Behavior 101:84-94, Dec 2019: randomized field experiment, n=237, comparing three batching schedules against a control. Hourly batching produced little change versus control; batching three times per day reduced stress and increased well-being; switching alerts off entirely produced more anxiety and fear-of-missing-out. Mechanism: batching trades interruption cost for delivery delay, and the benefit appears only when the delay is long enough to consolidate while the channel stays open - silence is not a batch, it is a removal. Applies to an overnight loop: "no notifications until morning" is not the same intervention as "two digests, 07:00 and 19:00", and the fully-off arm is the one that measurably backfires. Falsifiable prediction: a single morning digest will be rated more anxiety-inducing than two digests carrying the same content.''',
    "Computers in Human Behavior 101:84-94 (Dec 2019), n=237", "high", ["batching", "notifications", "cadence"]))

NODES.append(n(
    "batching-decays", "failure",
    "Email batching cut exhaustion, then the effect wore off within two weeks, with no effect on engagement",
    '''Hettinga et al. 2022, "For whom and under what circumstances does email batching work?", Internet Interventions 27:100494 (PMC8897209), a non-randomized field study in a Dutch financial-services organization: 73 people in 4 intervention teams (3 batches per day) versus 39 in 3 control teams, one month. The intervention group had fewer email interruptions and lower emotional exhaustion immediately after the intervention, strongest for high email volume and where instant response was not expected. Effects wore off after two weeks; there was no significant effect on work engagement. The authors' own conclusion: "email batching should not be regarded as panacea." Prior evidence is mixed: Kushlev and Dunn 2015 and Bradley 2013 found batching beneficial, Mark et al. 2016 found a non-significant correlation, Akbar 2019 found it helps the emotionally stable and aggravates the neurotic, and Dabbish and Kraut 2006 associated restricted checking with email overload. Notification policy is a habit that decays, not a setting.''',
    "PMC8897209, doi 10.1016/j.invent.2022.100494", "medium", ["batching", "decay", "habit"]))

NODES.append(n(
    "interruption-cost", "number",
    "Alert-driven switching cost about 10 minutes plus 10-15 minutes to resume; 27% never returned within two hours",
    '''Iqbal and Horvitz, CHI 2007 (DOI 10.1145/1240624.1240730), field study of 27 Microsoft employees over two weeks and 2,267 hours: after an alert-driven switch to email, the average time to return to any suspended application was 9 min 33 s (8 min for IM), followed by a resumption phase of roughly 11-16.5 min depending on alert type. In 27% of cases the participant had still not returned to the original window after two hours; 40.8% of email alerts produced a switch to mail within 15 s while the other 59.2% averaged 7 min 32 s. Confidence medium: these figures come from secondary summaries, the primary PDF could not be fetched. A widely repeated "23 minutes to recover" figure distorts this work and should not be cited. The asymmetry for a queue: the cost is per interruption, so 114 interruptions cost far more than 114 items reviewed in one sitting.''',
    "DOI 10.1145/1240624.1240730 (numbers via secondary summaries; primary unfetched)", "medium", ["interruption", "recovery", "cost"]))

NODES.append(n(
    "interruption-buys-speed", "claim",
    "Interrupted work was finished faster at equal quality, at the price of stress and effort - the cost is affective",
    '''Mark, Gudith, Klocke, CHI 2008 (DOI 10.1145/1357054.1357072) found that people completed interrupted tasks in less time with no difference in quality: they compensate by working faster. The measured cost appears in stress, frustration, time pressure and perceived effort, moderated by personality (openness, need for personal structure). This contradicts the naive model that interruption mainly costs throughput, and it matters for a 06:00 queue review: a supervisor interrupted mid-review still finishes and reports the review as harder, so throughput and self-report both look acceptable while the affective cost accumulates. Falsifiable prediction: in a queue-review task with periodic interrupts, completion time and accuracy stay flat while stress and skipped-item rate rise. Related: Czerwinski, Cutrell and Horvitz (CHI 2000) found interruptions during the evaluation phase caused significantly longer completion times, and irrelevant interruptions cost more resumption than relevant ones.''',
    "DOI 10.1145/1357054.1357072", "high", ["interruption", "stress", "throughput"]))

NODES.append(n(
    "breakpoints", "concept",
    "Deliver at round boundaries: interruption cost depends on when it lands and is worst during evaluation",
    '''Adamczyk and Bailey, CHI 2004 (DOI 10.1145/985692.985727, pp. 271-278) established that interruption cost depends on the moment within task execution, with natural breakpoints being cheaper. Czerwinski, Cutrell and Horvitz, CHI 2000 found that interrupting during the evaluation phase caused significantly longer completion times, and that irrelevant interruptions produced longer message processing and longer resumption than relevant ones. For an overnight loop this gives a delivery rule with a mechanism: a round boundary is a breakpoint (the worker has stopped, state is committed, nothing is half-written), whereas a mid-round notification lands during the agent's own evaluation phase and costs the most. It also gives a relevance rule: a notification about the campaign under current review is cheap, one about a different campaign is expensive. Falsifiable prediction: the same number of notifications, aligned to round completion, will be rated less disruptive and produce fewer abandoned reviews than notifications fired on mid-round threshold crossings.''',
    "DOI 10.1145/985692.985727; Czerwinski, Cutrell, Horvitz CHI 2000", "medium", ["timing", "breakpoint", "delivery"]))

NODES.append(n(
    "alarm-base-rate", "number",
    "In ICU monitoring 85-99% of alarms were non-actionable; the actionable share ran from under 1% to 26%",
    '''Alarm fatigue is the best-measured case of a human supervising a machine that reports constantly. Cvach 2012 (Biomed Instrum Technol 46(4):268-277) reviewed that 85-99% of ICU alarms are non-actionable; a systematic review in J Hosp Med 2016;11(2):136 (DOI 10.1002/jhm.2520) put the actionable share at under 1% to 26% in adult ICUs, above 20% elsewhere. Drew et al. 2015 (PLOS ONE) observed 461 patients over 31 days with 2,558,760 unique alarms, an audible burden of 187 alarms per bed per day and 88.8% false - those exact figures are medium confidence here because the article page could not be re-fetched. Mechanism: response rate to an alert is set by its prior probability of being actionable, not by its severity label, so a channel that is 90% noise gets treated as noise regardless of what the 10% contains. An overnight loop that alerts on every round builds a 90%-noise channel before the human ever sees a real failure.''',
    "Cvach 2012; DOI 10.1002/jhm.2520; Drew et al. 2015 PLOS ONE (medium confidence)", "medium", ["alarm-fatigue", "base-rate", "signals"]))

NODES.append(n(
    "actionable-alert", "concept",
    "An alert is actionable when it names a decision, an owner, and the default outcome of ignoring it",
    '''Combining the alarm-fatigue base rates (85-99% non-actionable; DOI 10.1002/jhm.2520) with the oversight study's finding that risky moments must become legible as requiring judgment (arXiv:2604.04918), an actionable notification has three testable components: (1) what changed, in one line, with the specific artifact and line range; (2) what decision is required, phrased as a choice with named options; (3) what happens if nobody acts, i.e. the default and its deadline. A message missing (2) is news, not an alert; missing (3) it cannot be triaged by cost. The ledger supplies a hard case: 80 of 127 real failures carried no diagnostic at all and all 80 had the diagnosis sitting in the child log (exp-fail-005), so 63% of the failure surface currently fails component (1) while the material to satisfy it already exists. Falsifiable prediction: adding (1)(2)(3) to every failure notification raises the fraction acted on within one day without increasing notification volume.''',
    "DOI 10.1002/jhm.2520; arXiv:2604.04918; exp-fail-005", "high", ["alerting", "actionability", "design-rule"]))

NODES.append(n(
    "out-of-loop", "claim",
    "The out-of-the-loop problem predicts the morning-after supervisor has low situation awareness and slow failure detection",
    '''Endsley and Kiris, Human Factors 37(2):381-394, 1995 (DOI 10.1518/001872095779064555), automated a navigation task with an expert system and measured situation awareness and response to automation failure. Low situation awareness corresponded with out-of-the-loop performance decrements, specifically in decision time after the expert system failed; proposed causes are loss of manual skill, loss of situation awareness, vigilance and complacency effects, a shift from active to passive processing, and changed feedback. The human who supervises an overnight loop is in exactly this condition by construction: they did not perform the work, they did not watch it, and they arrive after the fact. The implication is not "show more detail" but "reconstruct the state the human would have had": what was attempted, what was expected, what actually happened, and what would count as a surprise. Falsifiable prediction: a handoff presenting expected-versus-actual per round will cut time-to-first-correct-decision on a seeded failure relative to a chronological log.''',
    "DOI 10.1518/001872095779064555", "high", ["situation-awareness", "handoff", "supervision"]))

NODES.append(n(
    "automation-bias-multitasking", "claim",
    "Automation bias is documented mainly under multitasking and complexity - exactly the queue condition",
    '''Lyell and Coiera, "Automation bias and verification complexity: a systematic review", JAMIA 24(2):423-431, 2017 (DOI 10.1093/jamia/ocw105): automation bias is overreliance on decision support that reduces vigilance in information seeking and processing. The review's framing is the useful part: the prevailing human-factors view is that automation bias occurs mainly in multitasking environments, and the health-care literature shows the same association with task complexity. A supervisor working a 114-item queue is multitasking by definition, so automation bias is the expected baseline condition, not an individual failing. This reframes the interface question: the design goal cannot be "make the human vigilant", it has to be "reduce the number of simultaneous judgements required per decision". Falsifiable prediction: presenting queue items strictly one at a time, with the previous item resolved before the next appears, reduces acceptance of incorrect proposals relative to a scannable list.''',
    "DOI 10.1093/jamia/ocw105", "high", ["automation-bias", "multitasking", "queue"]))

NODES.append(n(
    "accountability", "claim",
    "Making someone accountable for decision accuracy reduced automation bias in experiment - a cheap, testable lever",
    '''Skitka, Mosier, Burdick and Gentry (1999) found that holding participants accountable for their performance or decision accuracy reduced automation bias relative to a no-accountability condition. The mechanism is a shift from acceptance to verification: if the decision will be reviewed, checking becomes instrumentally useful. For an unattended loop this becomes an interface element that costs almost nothing to build - every approval requires one line of justification, and a sample is later audited against the artifact. Honest limit: this is a 1999 laboratory result with a decision-support aid, verified here only at second hand through the automation-bias literature, not a study of code-patch review; the transfer is an inference, not a measurement, hence medium confidence. Falsifiable prediction: requiring a one-line justification per approved patch with a 10% blind audit lowers the acceptance rate of seeded-defect patches relative to one-click approve, and raises median dwell per item.''',
    "Skitka et al. 1999 (second-hand via automation-bias literature; not independently fetched)", "medium", ["accountability", "audit", "lever"]))

NODES.append(n(
    "oversight-strategy-exposure", "claim",
    "Oversight strategy changed which harmful actions users were exposed to more reliably than it changed their ability to correct them (N=48)",
    '''Chen et al., arXiv:2604.04918v1 (Apr 2026), within-subjects with 48 participants, six live-web tasks in two consequence levels with embedded privacy leakage, prompt injection and dark patterns, under four oversight strategies (risk-gated agent-led, approve-every-action, plan-level supervisory co-execution, structurally enriched plan plus step plus risk). The central measured claim: oversight strategy shaped users' exposure to problematic actions more reliably than their ability to correct those actions once visible; plan-based strategies reduced the occurrence of problematic actions without equally strong gains in runtime intervention success. Qualitative themes from their codebook: "repeated approvals create decision fatigue", "approve similar is perceived as dangerous", "oversight as approve-first, verify-later", "prefer consolidated oversight", "pace is too fast". Design consequence for a queue: prevention at plan time beats correction at approval time, and review capacity should be spent before execution, not after.''',
    "arXiv:2604.04918", "high", ["oversight", "strategies", "exposure"]))

NODES.append(n(
    "bulk-approve", "concept",
    "Approve-similar collapses N decisions into one and reproduces the multitasking condition automation bias needs",
    '''From the qualitative codebook of arXiv:2604.04918 ("approve similar is perceived as dangerous", "treat related fields as one category", "oversight as approve-first, verify-later"), plus the automation-bias condition of multitasking and complexity (DOI 10.1093/jamia/ocw105), a specific failure mode follows for a 114-patch queue: any bulk or approve-all-like-this control converts the visible decision surface back into a single decision made under time pressure, which is precisely the condition in which vigilance collapses. The same study found users prefer consolidated oversight, so the pressure toward bulk is real and is a preference, not an oversight. The design tension is therefore explicit: consolidation reduces effort and increases exposure, and both cannot be optimised at once. Falsifiable prediction: adding approve-similar to a queue interface increases approvals per minute and increases the number of patches approved without item-level inspection, measurable via dwell (the .622 vs .425 inactivity marker in arXiv:2610.27801).''',
    "arXiv:2604.04918; DOI 10.1093/jamia/ocw105; arXiv:2610.27801", "medium", ["bulk-approve", "consolidation", "risk"]))

NODES.append(n(
    "faster-confident-not-correct", "claim",
    "A better agent-trace interface cut error-finding time and raised confidence without improving accuracy",
    '''Grunde-McLaughlin, Mozannar, Murad, Chen, Amershi, Fourney, "Overseeing Agents Without Constant Oversight", arXiv:2602.16844 (Feb 2026), report three user studies on a Computer Use Agent: an action-trace baseline for verification, three design probes, then a novel interface evaluated on error-finding in question answering. Current trace practices were found cumbersome and limiting; the proposed design reduced time spent finding errors, and participants reported higher confidence in their decisions, but final accuracy was not meaningfully improved. This is the cleanest available warning against time-to-decision and self-reported confidence as success metrics for a supervision interface: both improved while the thing that matters did not. Falsifiable prediction: any queue UI change should be evaluated on audited defect escape rate against a seeded-defect set, and a change that only improves review latency or confidence should be treated as unproven.''',
    "arXiv:2602.16844", "high", ["metrics", "trace-ui", "false-progress"]))

NODES.append(n(
    "dwell-floor", "analysis",
    "A minimum dwell per patch is the cheapest force-function this loop can build, and it is testable",
    '''Three measurements combine. Recognition of a silent defect took M=10.8 min versus M=5.8 min for a miss, and the differentiating behavior was time without typing (.622 vs .425, d=1.29) (arXiv:2610.27801). Cognitive forcing functions reduce overreliance but are disliked (arXiv:2102.09692). Faster review raised confidence without raising accuracy (arXiv:2602.16844). A minimum-dwell rule - an approval cannot be registered until the diff has been open for, say, 90 s, or until every hunk has been scrolled past - is the local instantiation of all three: it forces the idle-thinking time that separated catching from missing, it is a forcing function so it will be disliked, and its success must be measured on catch rate, not on time saved. Falsifiable prediction: on a 20-patch audit set with 6 seeded defects, a 90 s dwell floor raises catch rate above an unconstrained baseline at a cost of roughly 20-30 minutes per session, and participants rate it worse.''',
    "arXiv:2610.27801; arXiv:2102.09692; arXiv:2602.16844", "medium", ["friction", "dwell", "proposal"]))

NODES.append(n(
    "report-bloat", "number",
    "69% of the brief is identical text and 47% is the report contract - dedupe before adding anything",
    '''The measured brief is 69% identical text, and the report contract alone accounts for 47% of it (exp-brief-001). This bounds what any additional interface element can achieve: if the human's reading budget is fixed, up to 69% of it is currently spent on text that does not change between rounds, and the actionable delta is at most 31%. Mechanism: identical text is not neutral - it costs scanning time and it trains the reader to skim, which is the same desensitisation mechanism as alarm fatigue (85-99% non-actionable, Cvach 2012) applied to prose. Design consequence: the first intervention is subtraction - diff the brief against the previous one and render only changed sections; the second is moving the contract out of the human view entirely. Falsifiable prediction: a brief that omits unchanged boilerplate is read further into the document per session and produces more acted-on failures, at equal or lower token cost.''',
    "exp-brief-001 (ledger)", "high", ["brief", "boilerplate", "attention-budget"]))

NODES.append(n(
    "failures-blank", "failure",
    "80 of 127 real failures shipped with no diagnostic, while the diagnosis already existed in the child log",
    '''Ledger measurement exp-fail-005: of 127 real failures, 80 carried no diagnostic at all, and all 80 had the diagnosis available in the child log. That is 63% of the failure surface blank at the point where a human would look, with the material to fill it already generated and paid for. This is a supply problem, not a summarization problem: the interface does not need to infer why a round failed, it needs to stop discarding the reason. It also interacts with the report contract: 47% of the brief is contract boilerplate (exp-brief-001), so budget spent on structure is being spent instead of on the one line that would make a failure actionable. Falsifiable prediction: extracting the last error line and the failing command from the child log into every failure entry raises the fraction of failures a human can classify without opening the log from 37% to above 90%, at negligible token cost.''',
    "exp-fail-005 (ledger)", "high", ["failures", "diagnostics", "ledger"]))

NODES.append(n(
    "cost-hidden", "number",
    "The queue is priced wrong by 71x: about 7 cents per landed promotion at real card prices",
    '''Ledger measurement w5-tokenbudget: cost per landed promotion is about 7 cents at real card prices, 71 times more than the ledger recorded. A supervisor deciding about a queue is implicitly making a cost decision - is this patch worth the run that produced it - and that decision is currently made against a number two orders of magnitude too small. Mechanism: the same understatement applies to whatever review costs if review is charged to the same budget, so the interface's own economics are invisible. Design consequence: show marginal cost per queued item next to the decision and show campaign spend against its cap, because a queue review that ignores cost will systematically over-approve expensive-to-reverify work. Falsifiable prediction: adding cost-per-item to the queue reduces the number of items approved for re-verification without changing the number approved for promotion, and shifts spend toward campaigns with higher landed-promotion yield.''',
    "w5-tokenbudget (ledger)", "high", ["cost", "pricing", "ledger"]))

NODES.append(n(
    "lessons-not-transferable", "claim",
    "Zero of 100 lessons were reused across campaigns, so a cross-campaign what-we-learned panel shows nothing",
    '''Ledger measurement exp-transfer-001: 0 cross-campaign reuse out of 100 lessons. Any interface element that aggregates lessons across campaigns is therefore displaying, by measurement, a body of text no campaign has ever acted on. The mechanism is that lessons are written in the vocabulary of the campaign that produced them (specific files, specific verifier commands) and a supervisor reading a different campaign cannot map them onto the decision in front of them - a retrieval problem, not a writing problem. Design consequence: the human view should show only campaign-local deltas plus a pointer to the exact artifact; the cross-campaign summary should be dropped from the brief until reuse is demonstrated above zero. Falsifiable prediction: replacing a global lessons panel with per-campaign "last three failures of this kind" produces measurable reuse (a lesson cited in a later round's brief) where the current panel produces none.''',
    "exp-transfer-001 (ledger)", "high", ["lessons", "transfer", "ledger"]))

NODES.append(n(
    "metr-horizon", "number",
    "Task horizons are doubling roughly every 7 months, so the unit the human must review keeps growing",
    '''METR, "Measuring AI Ability to Complete Long Tasks", arXiv:2503.14499 (Mar 2025), measured the 50%-success task time horizon doubling on a roughly 7-month cadence, with later revisions putting the post-2023 doubling at about 131 days and post-2024 at about 89 days. Naive extrapolation puts a one-month (167 work-hour) horizon somewhere between late 2028 and early 2031. For supervision interfaces the relevant consequence is not the date but the derivative: the unit a human must review grows over time, so a queue design tuned for 59-line patches (6,684 lines over 114 patches, exp-human-007) will be reviewing far larger patches within a few doublings, and dwell-per-item cannot scale by adding minutes. Falsifiable prediction: review interfaces must shift from per-line inspection to per-invariant checking (did the patch preserve stated properties) as patch size grows, and per-line dwell floors stop discriminating once patches exceed a few hundred lines.''',
    "arXiv:2503.14499", "medium", ["horizon", "scaling", "review-unit"]))

NODES.append(n(
    "morning-brief", "analysis",
    "A morning brief that earns its reading time: five fields, one screen, ranked by decision cost",
    '''Synthesis with a fixed shape, each field tied to a measurement. (1) What changed since the human last looked, diffed against the previous brief, because 69% of the current brief is identical text (exp-brief-001). (2) For each failure, the one-line cause pulled from the child log, because 80 of 127 failures currently have none and all 80 have it available (exp-fail-005). (3) N pending decisions ranked by cost of ignoring, each with a named default, because an alert without a default cannot be triaged (base rates in DOI 10.1002/jhm.2520). (4) Marginal cost per item, because real cost is 71x the ledger's number (w5-tokenbudget). (5) One seeded audit item per session, because a better trace interface raised confidence without raising accuracy (arXiv:2602.16844) and only an audit measures the human. Falsifiable prediction: this one-screen brief produces a higher rate of acted-on failures than the current 69%-boilerplate brief at equal token budget.''',
    "exp-brief-001; exp-fail-005; w5-tokenbudget; arXiv:2602.16844", "medium", ["design", "brief", "synthesis"]))

NODES.append(n(
    "ai-control-base-rate", "number",
    "An AI monitor that catches 38% of intentionally hidden backdoors is the machine-side analogue of a 39% human catch rate",
    '''Greenblatt, Roger, Sachan, Shlegeris, "AI Control: Improving Safety Despite Intentional Subversion", arXiv:2312.06942 (Dec 2023), evaluates protocols against an untrusted model that may insert backdoors into code, over a 5,000-problem benchmark. Numbers as reported for the first two table rows in a secondary paper: trusted monitoring completes the set with no undetected backdoor 62% of the time; trusted editing reaches 92%. Read as failure rates, a monitoring protocol misses 38% and an editing protocol misses 8%. That 38% sits within a point of the 39% silent-defect catch rate measured for humans in arXiv:2610.27801, which is the interesting coincidence: an automated monitor and an unaided human supervisor land at similar detection rates on adversarially hidden defects, while a protocol with a second model reviewing reaches 92%. Confidence medium: the figures are quoted from a secondary summary of Table 1, not read off the paper.''',
    "arXiv:2312.06942 (figures via secondary summary of Table 1)", "medium", ["monitoring", "base-rate", "ai-control"]))

NODES.append(n(
    "devils-advocate", "concept",
    "Explain the doubt, not the decision: a rationale that argues for approval is an approval-rate optimiser",
    '''Bansal et al. conclude from their own null result that explanations should be designed to expose doubt rather than to persuade, and raise asynchronous presentation and devil's-advocate framing as unexplored alternatives (arXiv:2006.14779). A secondary governance-design source states the same rule normatively - do not let the interface argue for its own proposal, because a system that generates a compelling rationale for its proposal is optimising approval rate, not decision quality - but that source is design guidance, not a measurement, so it is used here only as restatement, not evidence. The mechanism is the one measured in the paper: a rationale is competence evidence regardless of validity, and it moved subjective usefulness (70% vs 57%) while moving accuracy not at all. Concrete form for a queue: show the strongest reason not to merge - the assertion that would have caught it, the untested path, the touched file with no test - instead of a summary of why it is good.''',
    "arXiv:2006.14779 (plus non-measurement design guidance, flagged as such)", "medium", ["explanation", "doubts", "design-rule"]))

NODES.append(n(
    "show-failures-not-successes", "analysis",
    "Show failures by default and successes on demand: the asymmetry is in the base rate, not in the interest",
    '''Two ledger facts set the base rate for a morning view. 89 of 94 task verifiers pass on the clean base tree (exp-ver-003) and the score is binary (exp-score-001), so a successful round carries one bit that is mostly predicted; a failed round carries the diagnosis, and 80 of 127 failures carried none (exp-fail-005). Alarm research says response is governed by the prior probability that a message is actionable, not by its label (85-99% of ICU alarms non-actionable, Cvach 2012; DOI 10.1002/jhm.2520). Together: a view that lists successes spends finite attention on the majority class and dilutes the channel, while the minority class that needs a decision is the one currently blank. Falsifiable prediction: a brief listing only failures plus a count of successes is acted on faster than one listing both, and the difference grows as the campaign pass rate rises.''',
    "exp-ver-003; exp-score-001; exp-fail-005; Cvach 2012", "medium", ["signal", "failures", "defaults"]))

NODES.append(n(
    "two-windows", "analysis",
    "Two windows, not continuous and not silence: 07:00 triage and 19:00 deep review, delivered at round boundaries",
    '''Combining the batching RCT (hourly batching near control; 3x/day reduced stress and raised well-being; alerts fully off raised anxiety and fear-of-missing-out, Fitz et al. 2019, n=237) with the breakpoint result (interruption cost depends on the moment, evaluation-phase interruption is worst, Adamczyk and Bailey CHI 2004) and the decay result (batching benefits wore off in two weeks, PMC8897209), an overnight loop's notification policy has a defensible shape: two scheduled windows per day, aligned to round boundaries, with digest content ranked by decision cost. The windows are the batching intervention; alignment to round boundaries is the breakpoint intervention; expecting re-establishment after decay is the maintenance requirement. Falsifiable prediction: comparing continuous notification, a two-window digest, and no notification over four weeks, the digest wins on reported stress and acted-on-failure rate while the no-notification arm is worst on anxiety - and the digest's advantage shrinks by week three unless the schedule is re-affirmed.''',
    "Fitz et al. 2019 (CHB 101:84-94); DOI 10.1145/985692.985727; PMC8897209", "medium", ["cadence", "when", "synthesis"]))

NODES.append(n(
    "success-restores-trust", "number",
    "One intervening successful task collapsed silent-defect detection from 50% to 9.1%",
    '''arXiv:2610.27801 measured a carryover effect that is the most actionable number in the study. A silent defect placed immediately after a visible failure was detected in 12 of 24 cases (50%). When one correctly-completed task intervened between the visible failure and the silent defect, detection fell to 1 of 11 (9.1%); permutation p=.046, Fisher p=.023, residualized t=2.44 p=.020. The authors describe the effect as short-lived: a single success restores trust. Note the power limit - only 6 participants contributed to the gap sequence - so treat the 50-to-9.1 drop as directionally solid and the exact magnitude as uncertain. Mechanism: a visible failure raises vigilance, a success discharges it, and the discharge is not proportional to the evidence the success provides. Interface consequence: a morning view that interleaves green items between failures destroys the salience the failures created, and a run of green items before a failure is read as an all-clear.''',
    "arXiv:2610.27801", "medium", ["trust", "salience", "carryover"]))

EDGES = [
    ("success-restores-trust", "supports", "show-failures-not-successes",
     "A measured 50%-to-9.1% collapse after one intervening success is the strongest argument for not interleaving green items with failures."),
    ("success-restores-trust", "refines", "catch-rate-varies-8-to-75",
     "Explains variance the task-type table does not: recent history moves detection more than task type does, by a factor of five."),
    ("queue-is-the-product", "requires", "show-failures-not-successes",
     "A 114-item queue can only be worked if it is filtered; the measurement forcing the filter is the pass base rate, not a preference."),
    ("green-check-information-content", "refines", "queue-is-the-product",
     "Narrows the queue problem: the items cannot be ranked because the only visible signal is a nearly constant green badge."),
    ("green-check-information-content", "supports", "checks-pass-not-evidence",
     "Independent routes to the same mechanism - ledger verifier base rate (89/94 pass clean) and a controlled study where the sanctioned check was ritual."),
    ("checks-pass-not-evidence", "supports", "catch-rate-varies-8-to-75",
     "Same study: the aggregate 28/71 is decomposed by task type here."),
    ("catch-rate-varies-8-to-75", "supports", "dwell-marker",
     "Supplies the size of the detection problem the marker is meant to predict."),
    ("confidence-does-not-recalibrate", "refines", "catch-rate-varies-8-to-75",
     "Explains why the 79%-confident misses persist: absolute ratings have no reference class and did not move between rounds."),
    ("dwell-marker", "requires", "dwell-floor",
     "The marker is the measurement; the floor is the intervention built on it."),
    ("forcing-function-tradeoff", "supports", "dwell-floor",
     "Predicts the cost side of the proposal: the friction that works will be rated worse."),
    ("forcing-function-tradeoff", "supports", "bulk-approve",
     "Explains why bulk controls are attractive: the disliked interventions are exactly the effective ones, so users route around them."),
    ("explanation-raises-acceptance", "supports", "devils-advocate",
     "The null accuracy result plus raised acceptance is the reason to invert the rationale rather than enrich it."),
    ("explanation-error-split", "refines", "explanation-raises-acceptance",
     "Conditions the headline: the +5% AI-wrong gain appeared only where the human could read the underlying artifact."),
    ("explanation-raises-acceptance", "supports", "uncertainty-defers-question",
     "Supplies one half of the answer: acceptance rose with explanation, independent of correctness."),
    ("uncertainty-format", "supports", "dotplot-payoff",
     "Both point at frequency-form presentation; format rather than the presence of uncertainty is what moves behaviour."),
    ("dotplot-payoff", "supports", "uncertainty-defers-question",
     "Supplies the other half: a well-formed uncertainty display improved payoff by 5 pp, so uncertainty per se did not induce deference."),
    ("uncertainty-defers-question", "derived-from", "uncertainty-format",
     "The open question is generated by the gap between measured format effects and unmeasured deference behaviour in a queue."),
    ("batching-three-windows", "supports", "two-windows",
     "Supplies the cadence evidence: three windows worked, hourly did not, silence backfired."),
    ("batching-decays", "supports", "two-windows",
     "Supplies the maintenance requirement: the benefit decayed in two weeks."),
    ("interruption-cost", "supports", "two-windows",
     "Prices the thing the windows avoid: roughly 10 min plus 10-15 min per alert-driven switch."),
    ("interruption-buys-speed", "refines", "interruption-cost",
     "Does not contradict the recovery cost; it relocates it, showing throughput is preserved while stress and effort rise."),
    ("two-windows", "requires", "breakpoints",
     "The cadence only works if delivery lands on round boundaries rather than mid-round threshold crossings."),
    ("alarm-base-rate", "supports", "actionable-alert",
     "Gives the base rate that makes the three-part definition necessary rather than stylistic."),
    ("alarm-base-rate", "supports", "show-failures-not-successes",
     "Same desensitisation mechanism applied to the pass/fail mix of a morning view."),
    ("actionable-alert", "applies-to", "failures-blank",
     "The blank-failure measurement is the concrete instance where component (1) of the definition fails today."),
    ("out-of-loop", "supports", "morning-brief",
     "Justifies the expected-versus-actual field: the human's deficit is situation awareness, not detail."),
    ("automation-bias-multitasking", "supports", "bulk-approve",
     "Establishes the condition under which bulk approval is dangerous, rather than asserting it."),
    ("accountability", "supports", "dwell-floor",
     "An alternative or complementary lever to forced dwell; both work by making checking instrumentally useful."),
    ("oversight-strategy-exposure", "supports", "bulk-approve",
     "Measured finding that strategy shifted exposure more than correction, plus the qualitative approval-fatigue themes."),
    ("faster-confident-not-correct", "supports", "morning-brief",
     "Justifies the seeded audit item: only an audit can detect that a smoother interface made the human no more correct."),
    ("report-bloat", "supports", "morning-brief",
     "Sets the subtraction constraint: 69% identical text bounds what any addition can buy."),
    ("morning-brief", "requires", "report-bloat",
     "The brief cannot be built by adding fields; it requires removing the boilerplate first."),
    ("failures-blank", "supports", "show-failures-not-successes",
     "Shows the minority class is both the actionable one and the currently blank one."),
    ("show-failures-not-successes", "supports", "morning-brief",
     "Determines what the brief contains by default."),
    ("cost-hidden", "applies-to", "queue-is-the-product",
     "The queue review is a cost decision made against a number 71x too small."),
    ("lessons-not-transferable", "applies-to", "morning-brief",
     "Constrains which panels the brief may carry; measured reuse is zero, so a global lessons panel is decoration."),
    ("metr-horizon", "applies-to", "dwell-floor",
     "Predicts the failure mode of the proposal: dwell floors stop discriminating as review units grow."),
    ("ai-control-base-rate", "same-as", "catch-rate-varies-8-to-75",
     "Inexact pairing: 38% machine miss rate versus 39% human catch rate on hidden defects - same magnitude, different populations, so same-as marks the analogy not an identity."),
    ("ai-control-base-rate", "applies-to", "queue-is-the-product",
     "Frames the human supervisor as one monitoring protocol among others, with a measured comparison point (92% when a second model reviews)."),
    ("devils-advocate", "derived-from", "explanation-raises-acceptance",
     "The design rule is derived from the measured dissociation between usefulness ratings and accuracy."),
    ("devils-advocate", "contradicts", "bulk-approve",
     "The two point opposite ways on consolidation: doubt-first rationales preserve per-item judgement, bulk controls remove it."),
]

GAPS = [
    "Nobody has measured supervision of a multi-item overnight queue specifically: every cited study is a single-item or single-session choice. Decision quality as a function of items per session for a human reviewing agent patches is unmeasured.",
    "No study measures whether an uncertainty display changes skip/defer behaviour rather than approve behaviour; the existing reliance metrics all assume one decision in front of the participant.",
    "There is no dose-response measurement for dwell floors: the 10.8 vs 5.8 minutes result is observational, so the minimum seconds that would actually raise catch rate is unknown.",
    "The reviewer's own false-negative rate has never been measured in this ledger: there is no seeded-defect audit running as a standing metric, so nobody knows whether the human catches 39% or 80% of the bad patches they approve.",
    "Accountability (Skitka et al. 1999) has never been tested on code review or on an LLM-generated patch queue, and the result used here is second-hand.",
    "Batching has been studied on email, phone notifications and IM, never on agent supervision; the decay half-life of a notification policy in this setting is unmeasured.",
    "Long-running autonomy is unmeasured at the human interface: the Chen and Grunde-McLaughlin studies are single-session, so nobody knows what a supervisor should see from an agent that has been working for days.",
    "Cost per decision has not been studied as an interface element at all; nobody has measured whether showing marginal cost changes approval behaviour.",
    "The 71x cost understatement has no measured effect on human decisions because it is unknown whether the human ever saw the wrong number.",
    "No evidence on how a supervisor should treat the 5 of 94 verifiers that do not pass on the clean base tree - the only checks with real discriminative power - versus the 89 that do.",
    "Whether any of these interfaces changes the defect escape rate of a real promotion queue is untested end to end: the studies measure single decisions, the ledger measures promotions, and nothing connects the two.",
]

KINDS = {"claim", "concept", "project", "source", "question", "failure", "number", "analysis"}
RELS = {"supports", "contradicts", "refines", "requires", "supersedes", "applies-to", "derived-from", "measures", "fails-at", "same-as"}

ids = [x["id"] for x in NODES]
assert len(ids) == len(set(ids)), "duplicate ids"
for x in NODES:
    assert x["id"].startswith(P), x["id"]
    assert x["kind"] in KINDS, (x["id"], x["kind"])
    assert x["topic"] == T
    assert x["source"].strip() and x["confidence"].strip()
    assert isinstance(x["tags"], list) and x["tags"]
    if len(x["body"]) < 400:
        raise SystemExit("SHORT BODY %d %s" % (len(x["body"]), x["id"]))

for f, rel, t, note in EDGES:
    assert rel in RELS, rel
    assert P + f in ids, f
    assert P + t in ids, t
    assert f != t
    assert note.strip()

used = set()
for f, rel, t, note in EDGES:
    used.add(P + f); used.add(P + t)
orphans = [i for i in ids if i not in used]
assert not orphans, orphans

out = {
    "nodes": NODES,
    "edges": [{"from": P + f, "rel": r, "to": P + t, "note": nt} for f, r, t, nt in EDGES],
    "gaps": GAPS,
}

path = r"C:/Projects/RSI/research/wave8/w8-attention.json"
os.makedirs(os.path.dirname(path), exist_ok=True)
with open(path, "w", encoding="utf-8", newline="\n") as fh:
    json.dump(out, fh, ensure_ascii=False, indent=2)
    fh.write("\n")

print("path", path)
print("nodes", len(NODES), "edges", len(EDGES), "gaps", len(GAPS))
print("min body", min(len(x["body"]) for x in NODES), "max body", max(len(x["body"]) for x in NODES))
print("kinds", sorted({x["kind"] for x in NODES}))
print("rels", sorted({e[1] for e in EDGES}))
print("bytes", os.path.getsize(path))
