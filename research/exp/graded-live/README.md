# graded-live

A throwaway workspace for one question: **does a declared metric give the promotion
gate something to discriminate on?**

`check.mjs` prints `QUALITY=<n>` for the fraction of documented behaviours that
actually work. The harness reads that one number. A pass/fail verifier can only see
"did it exit 0"; this workspace is built so the exit code is 0 in most states and
only the printed number moves.
