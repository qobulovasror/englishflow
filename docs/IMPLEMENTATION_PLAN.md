# EnglishFlow implementation plan

This plan turns the product review into staged, reviewable work. Keep each phase small enough to review and commit independently. Update its status only after implementation and review.

## Working rules

- Confirm existing code before implementing an item; audit notes may be stale.
- Preserve unrelated workspace changes.
- Run the relevant checks for each implementation phase and fix regressions before committing.
- Get an independent code review for every phase; fix findings before committing.
- Do not ship behavioral changes without a rollback or migration plan where data is involved.

## Phase 0 — Baseline and plan alignment

**Status: complete**

- [x] Compare the highest-risk audit and roadmap claims with current code.
- [x] Keep this plan as the execution checklist; preserve the pre-existing untracked `docs/ANALYSIS.md` without editing or staging it.
- [x] Record the baseline findings below. Build and test commands are reserved for implementation phases where they validate a code change.

### Baseline findings

- Already present in code: refresh-token reuse detection, mobile quiz retry with answers retained in memory, mobile session-expiry reset, and a stable mobile router. Do not reimplement these; verify them while changing adjacent flows.
- Email delivery is configurable through SMTP environment settings. Production configuration and delivery monitoring still need validation; this is not an unimplemented mailer from scratch.
- Still confirmed: the 20-card new-word limit applies per `/learning/daily` response, not as a per-user daily cap; removing a word from an enrolled deck hard-deletes it and cascades learning history; mobile quiz answers are not persisted across app termination.
- Documentation differs in age and claims. Treat code plus targeted checks as authoritative, then reconcile the older audit and roadmap after the relevant work lands.
- Workspace condition: `docs/ANALYSIS.md` was already untracked before this work and is intentionally preserved.

## Phase 1 — Reliability and data integrity

**Status: planned**

- [ ] Verify mobile quiz answers survive submission/network errors and errors are never displayed as a zero score.
- [ ] Verify logout, expired sessions, and account switching clear user-scoped cached state on web and mobile.
- [ ] Verify review and quiz submission are idempotent under retries and concurrent requests.
- [ ] Prevent shared deck/word deletion from silently destroying other users' learning history; define detach/archive/delete behavior.
- [ ] Verify email normalization, password recovery anti-enumeration, reset/verification token invalidation, and production secret validation.
- [ ] Connect a production email transport through configuration, with safe local development behavior.
- [ ] Add PostgreSQL-backed integration coverage for migrations, transactions, review, quiz submission, and deck enrollment/deletion.
- [ ] Recheck extension permissions, API-origin changes, and token storage against current browser APIs.

## Phase 2 — Daily learning and onboarding

**Status: planned**

- [ ] Add learning-goal selection (purpose, daily time/new-word target) to onboarding and profile settings.
- [ ] Enforce the daily new-word limit across all requests, using the user's local calendar day.
- [ ] Make the dashboard show due reviews, new words, estimated time, and one primary start action.
- [ ] Clarify the four review ratings, show session progress, and provide clear completion/error/retry states.
- [ ] Ensure due-review backlogs can be worked through in manageable sessions without misrepresenting completion.

## Phase 3 — Stronger learning practice and content

**Status: planned**

- [ ] Add optional recall directions, typed answers, cloze/context questions, and listening practice.
- [ ] Enrich vocabulary with IPA, part of speech, collocations, examples, and reviewed translations/audio.
- [ ] Surface difficult words and quiz mistakes as targeted practice.
- [ ] Measure current SM-2 outcomes before experimenting with FSRS; preserve existing schedules and provide a rollback path.
- [ ] Add content review and quality controls for admin-managed vocabulary.

## Phase 4 — Mobile offline and browser extension

**Status: planned**

- [ ] Design local mobile storage and an idempotent review-event sync protocol.
- [ ] Support offline review, queued submissions, conflict handling, and visible sync status.
- [ ] Verify extension token isolation, host permissions, API URL validation, and on-demand page injection.
- [ ] Improve save confirmation, translation correction, and one-tap review from the extension.

## Phase 5 — Return-use features

**Status: planned**

- [ ] Add opt-in reminders with user-selected timing, quiet days, frequency controls, and easy disable.
- [ ] Add learning-based milestones/rewards without penalizing missed days.
- [ ] Consider friend challenges before public leaderboards; all social participation remains optional.
- [ ] Instrument onboarding completion, first-session completion, D7/D30 return, session completion, and notification opt-out.
- [ ] Evaluate features with controlled rollouts and learning/retention outcomes, not time-in-app alone.

## Phase 6 — Portability and shared content

**Status: planned**

- [ ] Add validated CSV import/export with preview, duplicate handling, and recoverable errors.
- [ ] Evaluate Anki-compatible import/export and document supported fields.
- [ ] Add safe deck sharing/copying with clear ownership, visibility, and moderation rules.
- [ ] Improve discovery by CEFR level, topic, goal, and content quality.
- [ ] Evaluate teacher/classroom features only after validating the need and access model.

## Phase 7 — Release readiness and maintenance

**Status: planned**

- [ ] Keep generated API/client types in sync and reduce duplicate type definitions safely.
- [ ] Add focused web component/store checks for critical learning, auth, and failure states.
- [ ] Add operational dashboards/alerts for API errors, failed email, sync backlog, and database health.
- [ ] Verify backup/restore, migration rollback strategy, privacy/data deletion, and production deployment steps.
- [ ] Refresh README, architecture, audit, and release notes to match shipped behavior.
