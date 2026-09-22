# Tracker — tracking-document

> Status of every task in the epic. `implement` updates `done` as it commits each task.
> States: `todo` · `in_progress` · `blocked` · `review` · `done`.

| # | Task | Layer | Owner | Estimate | Blocked by | Status |
|---|---|---|---|---|---|---|
| T1 | Define tracking-document domain types | domain | \<TBD lead\> | M | — | todo |
| T2 | Implement getStatusDocuments (raw batch method) | app | \<TBD lead\> | S | T1 | todo |
| T3 | Implement getDocumentStatus (convenience, match-by-identity) | app | \<TBD lead\> | S | T1 | todo |
| T4 | Wire public exports | wiring | \<TBD lead\> | XS | T2, T3 | todo |
| T5 | Unit test suite | tests | \<TBD lead\> | L | T4 | todo |
| T6 | Build-surface completeness check | tests | \<TBD lead\> | S | T4 | todo |
| T7 | Opt-in integration smoke test | tests | \<TBD lead\> | S | T4 | todo |
| T8 | README usage example | docs | \<TBD lead\> | XS | T4 | todo |

**Total:** 8 tasks, ~1 week (S size, per `sad.md` §2 effort budget — the 118-field exhaustive type
in T1 is the sizing risk `sad.md` §11 flags to watch).
