# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Barangay Health Worker (BHW)** — the primary user. Enters household profiles and resident records at the health center desk, and enters data on a phone during household visits in the field. Sees only the puroks assigned to their account. This is the only role that writes resident data.
- **Rural Health Midwife (MIDWIFE)** — read-only across every purok. Reviews resident profiles, builds program masterlists, prints them on the health center letterhead, and signs off on them.
- **Administrator (ADMIN)** — manages user accounts and purok assignments only. Never sees resident health data.

## Product Purpose

The Barangay Tago Health Center keeps its resident records on paper forms and spreadsheets. This system replaces them with one audited record per household and per resident: household registration, a resident directory, target-group masterlists, and print-ready reports.

Success means a health worker can encode a household in the field and the midwife can produce a signed masterlist from it without re-keying anything, and every change to a record is attributable and reversible (records are deactivated, never deleted).

## Positioning

Purok-scoped access on the record itself, not just on the screen. A worker's account determines which parts of the barangay they can see at all — the same boundary the paper system enforced by handing each worker only their own purok's stack. On top of that sits an audit trail: every write carries the acting user, and no resident, household, or account is ever deleted.

## Operating Context

- The health center desk: a shared workstation, printers nearby, masterlists signed by hand on the letterhead.
- The field: household visits, sometimes on a phone, sometimes with paper forms in hand that are later keyed in.
- The masterlist output is a physical artifact — it is printed, signed by the midwife, filed, and handed to the city or the barangay captain.
- The paper form vocabulary is the domain's own: "purok", "head of household", "senior citizen", "4Ps", "Family Planning", "SER / EC", "masterlist", "certified correct".
- Only open-source tooling and fonts are permitted in the project.
- The app ships over HTTPS behind nginx; the browser never talks to the database.

## Capabilities and Constraints

- Three tiers: React + Vite web client, Express REST API on port 3000, PostgreSQL 16. Docker Compose runs `nginx`, `api`, `db`. Port 443 is the only published port.
- The API contract is fixed by `docs/openapi.yaml` (11 endpoints). Field names, enums, status codes, and error shape must match it exactly.
- Roles are enforced by the API on every request, not only in the UI.
- The API connects as the least-privilege `bhc_api` role, never as the database owner. All SQL is parameterized; no ORM.
- Nothing is deleted. Residents, households, and users are deactivated with `is_active = false`.
- Data-changing transactions set `app.current_user_id`; triggers use it for `created_by`, `updated_by`, and the change log.
- Raw database error text is never returned to the client.
- Passwords are bcrypt-hashed; passwords, tokens, and hashes are never logged.
- **Synthetic data only. Real resident data must never be entered, printed, or committed.**
- Offline entry, SMS, government-system integration, clinical records, and real deployment are out of scope.
- Open-source dependencies only, and the dependency list is closed: express, pg, zod, jsonwebtoken, bcryptjs, helmet, express-rate-limit, cors (if needed), React, Vite, React Router, Vitest or Node test runner, supertest. Nothing else is added without asking.
- Every endpoint needs at least one success test and one failure test.

## Brand Commitments

- Name: **Barangay Tago Health Center**, Naga City. The sign-in surface may also carry "Republic of the Philippines · City Government of Naga" as an institutional line.
- Voice: plain, official, and specific. Field labels use the domain's own terms; buttons name their action; errors name the problem and the recovery.
- Visual identity is **open**. The teal-and-plus-Jakarta-Sans treatment that shipped previously is not a fixed constraint; the palette, typography, and shell may be replaced as long as the interface stays fast, legible, and calm to work in.
- The mark is a health cross. Its drawing is free to change.
- Screens are print-adjacent: the masterlist screen and the printed masterlist are the same document, on screen and on paper.

## Evidence on Hand

- Synthetic demo accounts and seeded residents: `database/03_demo_seed.sql`. Usernames `admin1`, `midwife1`, `bhw1` (Purok 1), `bhw2` (Puroks 2 and 3). Password `Demo#12345`.
- Incumbent UI captures of all five routes at desktop, tablet, and mobile widths: `.taste-skill/after/`.
- Prior art for the incumbent look and its rules: `.taste-skill/direction.json`.
- **No photography, no logos, no seal artwork, no real documents, and no testimonials exist.** Any imagery used must be authored and labeled synthetic, or omitted. Nothing may imply a real resident, a real count, or a real endorsement.

## Product Principles

1. **The record is the product.** A resident exists once, with one household, one purok, one history. Every screen reads that record rather than restating it.
2. **Access is a boundary in the data, not a filter on the screen.** What a worker cannot see, they cannot even count.
3. **Every write leaves a trail, and nothing is lost.** Deactivate, never delete; the audit line names the person.
4. **The paper form is the ancestor.** The official DOH / barangay forms set the vocabulary and the layout logic; the screen version should be faster to use and identical in what it records.
5. **The phone is a field instrument, not a squeezed desktop.** A worker encoding a household on a phone is doing a different job from one reviewing records at a desk.

## Accessibility & Inclusion

- Body and placeholder text at 4.5:1 minimum, large text at 3:1.
- Every control reachable and visible by keyboard, with a visible focus ring.
- The printed masterlist must remain legible in black and white — it is printed on an office printer, not a color laser.
- Touch targets at least 44px on the phone layout, where a worker may be wearing gloves or working in bright outdoor light.
- All resident data in the demo is synthetic.
