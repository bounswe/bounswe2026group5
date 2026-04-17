# Refactor Plan: Backend Domain, API, and Client Alignment

Date: 2026-04-17
Status: Active implementation. Phases 1-4 completed, Phase 5 in progress.
Project: Campus Neighborhood Mentorship Network

## 0. Implementation Progress Snapshot (2026-04-17)

1. Completed: Phase 1 role separation hardening.
2. Completed: Phase 2 MeetingSession model introduction and compatibility rollout.
3. Completed: Phase 3 service-layer orchestration extraction.
4. Completed: Phase 4 endpoint normalization to me-scoped APIs with legacy aliases.
5. In progress: Phase 5 client adoption of canonical backend contracts.
6. Completed in this iteration (web): self-scoped calls migrated to `/auth/me/`, `/auth/me/role/`, `/profiles/me/`, and `/profiles/me/availability-slots/` for owner write flows.
7. Completed in this iteration (mobile): registration onboarding role/profile setup migrated to `/api/auth/me/role/` and `/api/profiles/me/`; mentor availability write flows migrated to `/api/profiles/me/availability-slots/`.
8. Completed in this iteration (web + mobile): schedule/dashboard session reads now consume canonical `/api/mentorship/meeting-sessions/me/` payloads, replacing local role/status heuristics and mentor-side profile fan-out.
9. Completed in this iteration (stability): unresolved mobile merge markers were removed from tab screens and test suites were re-aligned to canonical meeting-session hooks.
10. Remaining in Phase 5: finish retiring legacy session endpoint consumers (`/sessions/me/upcoming`, `/sessions/mentor/*`) and complete action-route normalization from `{match_id}` to `{session_id}` when backend route contract is finalized.

## 1. Goals

1. Refactor backend models, business logic, and endpoints to reduce coupling and improve maintainability.
2. Move schedule, booking, and role-branching business logic from web and mobile clients into backend services.
3. Introduce a first-class MeetingSession domain model instead of reconstructing session state from multiple tables.
4. Remove ProfileExpertise and ExpertiseField as active domain direction and keep profile-level rating semantics.
5. Normalize self-scoped API contracts to me endpoints while preserving temporary compatibility.
6. Enforce strict single-role accounts: a user is either MENTOR or MENTEE, never BOTH.

## 2. Adopted Standards Integrated Into This Plan

This plan aligns implementation with the standards in .github/copilot-instructions.md.

1. Backend stack and API contracts:

- Django + DRF + PostgreSQL.
- RESTful HTTP semantics.
- OpenAPI 3.0 generation via drf-spectacular.

2. Security and data handling:

- JWT/OAuth2 stateless auth headers.
- OWASP controls: no raw SQL, strict authorization, secret hygiene.
- ISO 8601 UTC date-time handling end-to-end.

3. Code quality and maintainability:

- PEP 8 compliant Python with clear docstrings.
- Service-layer orchestration for domain flows.

4. Accessibility and SEO support:

- Backend to expose schema-friendly fields for public profile pages.
- JSON-LD and Schema.org integration for public-facing web pages, supported by backend payload contracts.

## 3. Confirmed Architecture Decisions

1. Single-role accounts are mandatory.

- A user profile cannot be BOTH mentor and mentee.
- Remove BOTH behavior from all runtime contracts and client assumptions.

2. Session lifecycle becomes mentorship-domain owned.

- Profiles app owns only mentor availability CRUD.
- Mentorship app owns request acceptance, booking, rescheduling, cancellation, and session lifecycle.

3. MeetingSession becomes the canonical source of session truth.

- Client-side derived session status and role labels will be replaced by backend-provided fields.

4. ProfileExpertise direction is retired.

- Keep profile-level rating and review count behavior.
- Move to a simpler skill representation and profile-level aggregates.

## 4. Current Pain Points (Validated)

1. Session behavior is fragmented across AvailabilitySlot, MentorshipRequest, and Match.
2. Mentorship services module is empty and logic is spread across views and model side effects.
3. Self APIs are inconsistent and path-coupled to user_id or username.
4. Clients derive status and role logic locally, creating duplicate and divergent behavior.
5. app_usage_mode has cross-layer mismatch because some client code still expects BOTH.

## 5. Target Domain Architecture

1. accounts app:

- Owns authentication and immutable account role.
- Exposes me-scoped auth endpoints.

2. profiles app:

- Owns public/own profile fields and mentor availability slots.
- Removes ProfileExpertise and ExpertiseField from active model layer.

3. mentorship app:

- Owns mentorship requests, matches, meeting sessions, and feedback.
- Introduces explicit service orchestration with transaction boundaries.

## 6. Data Model Refactor

### 6.1 Account role enforcement (single-role)

1. Keep enum values: MENTOR, MENTEE only.
2. Remove any runtime acceptance or mapping of BOTH.
3. Decide and implement role mutability policy:

- Recommended: role immutable after registration for strict account separation.

4. If immutable is adopted:

- Deprecate user self role-switch endpoint.
- Keep admin-only migration path if needed.

### 6.2 Profile model simplification

1. Remove ExpertiseField and ProfileExpertise from active models.
2. Preserve profile-level average_rating and review_count.
3. Keep skills/eager_to_learn as explicit arrays/relations aligned with existing API contract.

### 6.3 MeetingSession introduction

Add MeetingSession in mentorship app with fields similar to:

1. id (UUID).
2. match (FK).
3. mentor_profile (FK), mentee_profile (FK).
4. source_slot (FK nullable, set null on slot detach or deletion).
5. scheduled_start_at_utc, scheduled_end_at_utc.
6. status (SCHEDULED, COMPLETED, CANCELED, RESCHEDULED).
7. canceled_by_role and cancel_reason nullable.
8. created_at and updated_at.
9. Indexes on mentor_profile + scheduled_start_at_utc, mentee_profile + scheduled_start_at_utc, status.

Backfill migration strategy:

1. Create MeetingSession table.
2. Backfill from accepted MentorshipRequest plus Match and slot snapshots.
3. Keep legacy request slot snapshot fields temporarily.
4. Switch reads to MeetingSession.
5. Remove legacy session reconstruction after clients migrate.

## 7. API Refactor and Compatibility Matrix

### 7.1 Self endpoint normalization

| Current                                                         | Target                                          | Compatibility policy                        |
| --------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------- |
| /api/auth/{user_id}/                                            | /api/auth/me/                                   | Keep old path as temporary alias            |
| /api/auth/{user_id}/app-usage-mode/                             | /api/auth/me/role/ or remove for immutable role | Alias only during migration window          |
| /api/profiles/{username}/ for own profile updates               | /api/profiles/me/                               | Keep username path for public profile reads |
| /api/profiles/{username}/availability-slots/ (owner operations) | /api/profiles/me/availability-slots/            | Keep username path for public read/list     |

### 7.2 Session endpoints

| Current                                         | Target                                                   |
| ----------------------------------------------- | -------------------------------------------------------- |
| /api/mentorship/sessions/me/upcoming/           | /api/mentorship/sessions/me/?status=upcoming             |
| /api/mentorship/sessions/me/past/               | /api/mentorship/sessions/me/?status=past                 |
| /api/mentorship/sessions/mentor/upcoming/       | /api/mentorship/sessions/me/?role=mentor&status=upcoming |
| /api/mentorship/sessions/mentor/past/           | /api/mentorship/sessions/me/?role=mentor&status=past     |
| /api/mentorship/sessions/{match_id}/cancel/     | /api/mentorship/sessions/{session_id}/cancel/            |
| /api/mentorship/sessions/{match_id}/reschedule/ | /api/mentorship/sessions/{session_id}/reschedule/        |

### 7.3 Response contract enrichment

Unified session payload should include:

1. session_id.
2. mentor and mentee summaries.
3. scheduled_start_at and scheduled_end_at in ISO 8601 UTC.
4. display_status from backend.
5. my_role from backend.
6. allowed_actions list from backend.

## 8. JSON-LD and Schema.org Integration Plan

This project requires structured data for public-facing pages. Because SEO rendering is web concern, backend support is contract-first.

1. Backend support:

- Add schema-friendly fields to public mentor profile response.
- Optionally add dedicated endpoint:
  /api/profiles/{username}/structured-data/

2. Suggested Schema.org shape:

- Primary entity: Person.
- Related entities when available: EducationalOrganization, Event.
- Include name, image, url, jobTitle, aggregateRating, and mentorship-related descriptors.

3. Web integration:

- Inject script type="application/ld+json" in public profile page head.
- Use backend payload to avoid frontend data duplication.

4. Mobile:

- No SEO requirement; skip JSON-LD rendering.
- Keep contract parity for shared data fields.

## 9. Detailed Phased Implementation

### Phase 0: Baseline freeze and contract snapshots

1. Freeze current behavior with test inventory and OpenAPI snapshot.
2. Record all endpoints used by web and mobile.
3. Add temporary compatibility checklist for migrations.

### Phase 1: Role separation hardening

1. Remove BOTH handling from backend views and serializers.
2. Update error messages and validation semantics to single-role language.
3. Decide immutable role policy and enforce it.
4. Update mobile and web type unions to MENTOR | MENTEE only.

### Phase 2: Introduce MeetingSession model and backfill

1. Add model and migration.
2. Backfill from accepted requests and slot snapshots.
3. Add serializers and read endpoints while keeping old endpoints operational.

### Phase 3: Service-layer extraction

1. Create mentorship services for:

- create_request
- respond_to_request
- cancel_session
- reschedule_session
- deactivate_match
- submit_feedback

2. Move transactional logic out of views and model save side effects.
3. Keep view layer thin and authorization-centric.

### Phase 4: Endpoint normalization with aliases

1. Add /api/auth/me/ and /api/profiles/me/ families.
2. Keep legacy user_id and username write paths as temporary aliases.
3. Mark legacy routes deprecated in schema docs.

### Phase 5: Remove client-side business derivation

1. Web migration:

- Replace local status derivation and first-time booking decisions with backend fields.
- Stop fan-out profile queries for schedule peer enrichment where backend can return counterpart payload.

2. Mobile migration:

- Consolidate duplicated mentorship query modules.
- Remove direct fetch calls from screens where query modules exist.
- Replace local status mapping and role heuristics with backend display_status and my_role.

### Phase 6: ProfileExpertise retirement

1. Remove models and related admin/tests.
2. Migrate any retained data into profile-level skill/rating representation.
3. Keep public rating endpoint behavior stable.

### Phase 7: Contract cleanup

1. Remove deprecated aliases after web and mobile are fully migrated.
2. Remove legacy slot snapshot fallback paths no longer needed.
3. Regenerate and publish final OpenAPI schema.

## 10. Testing Strategy

1. Backend unit tests:

- Request/match/session lifecycle tests.
- Authorization and role-policy tests.
- Migration and backfill integrity tests.

2. API contract tests:

- Legacy alias behavior during migration window.
- New me endpoint parity.

3. Client integration tests:

- Web and mobile schedule/dashboard/connections parity.
- Role-gated actions and errors.

4. Regression focus areas:

- Slot booking race conditions.
- Cancel/reschedule transactional consistency.
- Rating threshold update behavior.

## 11. Risks and Mitigations

1. Risk: breaking existing clients due to endpoint renames.

- Mitigation: temporary aliases and staged client migration.

2. Risk: data inconsistency during MeetingSession backfill.

- Mitigation: transactional migration scripts and verification queries.

3. Risk: role-policy changes break settings UX.

- Mitigation: migrate settings to role display plus account-switch guidance if immutable policy is chosen.

4. Risk: structured data drift between backend and web rendering.

- Mitigation: backend contract test plus web snapshot test for JSON-LD payload.

## 12. Definition of Done

1. MeetingSession is the single source for session reads and actions.
2. No BOTH handling remains in backend, web, or mobile runtime contracts.
3. me endpoints are primary, legacy endpoints are deprecated then removed.
4. ProfileExpertise and ExpertiseField are removed from active domain model.
5. OpenAPI docs reflect final contracts.
6. Public web profile pages can render valid Schema.org JSON-LD from backend-supported contract.
7. Full backend and client test suites pass.

## 13. Immediate Next Implementation Slice

1. Migrate web API consumers to canonical me-scoped endpoints.
2. Migrate mobile API consumers to canonical me-scoped endpoints.
3. Remove client-side role and status derivation where backend now provides canonical fields.
4. Publish compatibility timeline for legacy alias removal.
5. Begin Phase 6 cleanup for ProfileExpertise retirement after client migration stabilizes.
