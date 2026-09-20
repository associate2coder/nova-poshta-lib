---
status: Living
updated_at: "2026-09-20"
---

# Domain Context — nova-poshta-lib

## Glossary

- consuming developer — a developer who installs and calls this library's typed methods from their own Node.js/TypeScript project. NOT Nova Poshta itself (the external API this library wraps) and NOT an end customer or shipment recipient — this library has no shipment-recipient role of its own, only the developer calling it.
- reference list — a static or semi-static enumerable list of valid values that the Nova Poshta API expects as input to other requests, exposed read-only by the common domain module. NOT a paginated result set of business records (like a list of counterparties or shipments returned by other modules) — reference lists are small, mostly-static enumerations, not growing transactional data.
