---
status: Living
updated_at: "2026-09-20"

---

# Domain Context — nova-poshta-lib

## Glossary

- consuming developer — a developer who installs and calls this library's typed methods from their own Node.js/TypeScript project. NOT Nova Poshta itself (the external API this library wraps) and NOT an end customer or shipment recipient — this library has no shipment-recipient role of its own, only the developer calling it.
- reference list — a static or semi-static enumerable list of valid values that the Nova Poshta API expects as input to other requests, exposed read-only by the common domain module. NOT a paginated result set of business records (like a list of counterparties or shipments returned by other modules) — reference lists are small, mostly-static enumerations, not growing transactional data.
- counterparty — a legal entity or private individual Nova Poshta associates with a shipment (sender, recipient, or the API key holder's own registered entity), used to scope which saved addresses belong to whom. NOT the consuming developer (this library's caller) — a counterparty is a Nova Poshta business entity, not this library's user.
- Ref — a UUID Nova Poshta assigns to identify a specific record (a city, street, warehouse, settlement, address, or counterparty) so it can be passed into later API calls. NOT a human-readable name or address string — a Ref can only come from a prior lookup, never typed by hand.
- settlement — Nova Poshta's broader directory of Ukrainian localities (cities, towns, villages) reachable for delivery, independent of whether Nova Poshta has a branch there. NOT city — a city is the narrower subset of settlements where Nova Poshta actually operates a branch.
- warehouse — a Nova Poshta branch, depot, or parcel locker where a shipment can be picked up or dropped off. NOT a personal/business storage warehouse — this is Nova Poshta's own delivery infrastructure, not the consuming developer's or their customer's storage space.
- ThirdParty — a counterparty registered as neither the API key holder's own sender entity nor the shipment's recipient, e.g. a marketplace shipping on behalf of a supplier. NOT sender — sender is the API key holder's own registered entity, while ThirdParty is always a distinct third company.
- PrivatePerson — a counterparty saved as an individual (not a registered business), identified by name and phone. NOT Organization — an organization is a registered legal entity, identified by an EDRPOU business-registration number, not a personal name.
- Organization — a counterparty saved as a registered legal entity, identified by an OwnershipForm (its legal structure) and an EDRPOU business-registration number. NOT PrivatePerson — a private person has no business registration, only a personal name and phone.
- contact person — a named individual (name, phone) attached to a counterparty as the point of contact for pickup or delivery. NOT the counterparty itself — a counterparty can have multiple contact persons, and a contact person has no independent existence outside the counterparty it belongs to.
