# Tracker — tracking-document

> Status of every task in the epic. `implement` updates `done` as it commits each task.
> States: `todo` · `in_progress` · `blocked` · `review` · `done`.

| # | Task | Layer | Owner | Estimate | Blocked by | Status |
|---|---|---|---|---|---|---|
| T1 | Define tracking-document domain types | domain | \<TBD lead\> | M | — | done |
| T2 | Implement getStatusDocuments (raw batch method) | app | \<TBD lead\> | S | T1 | done |
| T3 | Implement getDocumentStatus (convenience, match-by-identity) | app | \<TBD lead\> | S | T1 | done |
| T4 | Wire public exports | wiring | \<TBD lead\> | XS | T2, T3 | done |
| T5 | Unit test suite | tests | \<TBD lead\> | L | T4 | done |
| T6 | Build-surface completeness check | tests | \<TBD lead\> | S | T4 | done |
| T7 | Opt-in integration smoke test | tests | \<TBD lead\> | S | T4 | done |
| T8 | README usage example | docs | \<TBD lead\> | XS | T4 | done |

**Total:** 8 tasks, ~1 week (S size, per `sad.md` §2 effort budget — the 118-field exhaustive type
in T1 is the sizing risk `sad.md` §11 flags to watch).
