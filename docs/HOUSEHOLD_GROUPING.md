# Household grouping in the Resident Directory

**Status: complete and committed** (`7449c35` on `main`). The impeccable subagent's
version of the design is preserved on `backup/subagent-wip` (`12931ec`) if any of it
is wanted later.

## What changed

Households are the unit a health worker actually works in, so the resident directory
now keeps a family together instead of scattering its members by surname.

### API — `GET /api/residents`

New optional `group_by` parameter (`name` | `household`).

* `group_by=household` orders the list household first — head, then spouse, then
  children by age — and the page is counted in **households**, so a household is
  never split across two pages.
* Every item carries `household_member_count`, so a group narrowed by a filter is
  visible as "2 of 4 members shown".
* The response also reports `total_residents` and `total_households`, so both
  counts are always available whichever way the list is grouped.
* API responses are now `Cache-Control: no-store`. A cached list was showing a
  directory that no longer matched the database after an edit.

Filters are unchanged: they still select residents. A household is listed when at
least one member matches, and the members that match are shown.

### UI — Resident directory

* A **By household / By name** switch in the toolbar.
* In household mode each household gets a group header — household number, purok,
  member count, and an *Open household* action — with its members indented under
  it, head first.
* The pager counts households instead of residents, and the toolbar reads
  "5 households · 11 residents".
* Opening a household shows the full household record (address, water source,
  toilet facility, 4Ps, reviewer) and every member of that household, with an
  edit action per member.

## Verification

* `api`: 16/16 tests in `test/residents.test.js` pass, including five new ones
  covering contiguity, head-first ordering, household paging, member counts and
  zone scoping. The two failures in `test/masterlists.test.js` are pre-existing
  (they fail on the unmodified code too — the demo seed has drifted).
* `web`: production build passes. The design inspector reports **0 FAIL** on the
  resident directory, encode household and staff accounts; 1 defended WARN each on
  the masterlists preview (the gap before a document's signature block) and the
  login hero (a deliberate full-bleed rest).
* `docs/openapi.yaml` documents the new parameter and response fields.

## Note

A second OpenCode session was editing the same files at the same time
(`backup/subagent-wip`). Its version was restored away; if it reappears, the
working tree can be reset with `git reset --hard 7449c35`.
