# Plan

## How did you break the work into sessions?

I broke the work into a backend-first phase, a frontend phase, and a final verification/documentation phase.

### Backend sessions

I started with the foundational pieces that everything else depended on:

1. **T1–T2: Foundation, authentication and roles**
   - Set up Express, Prisma, PostgreSQL/Supabase and the basic application structure.
   - Implemented JWT authentication and password hashing.
   - Added INSTRUCTOR, LEARNER, and the minimal ADMIN role for instructor provisioning.

2. **T3–T5: Courses, lessons, lifecycle, enrollment/progress and catalog**
   - Built course and lesson CRUD.
   - Added the DRAFT → PUBLISHED → ARCHIVED lifecycle and publish validation.
   - Added lesson ordering/reordering.
   - Added learner self-enrollment, instructor enrollment, bulk enrollment, lesson completion and derived progress states.
   - Built the server-side catalog...

3. **T6, T8, T7 and T9: Audit, alerts, dashboard and export**
   - Added activity logging and comments.
   - Implemented inactivity alerts and episode-scoped dismissal.
   - Added the instructor dashboard and completion trend.
   - Added authenticated CSV progress export.

T8 was deliberately worked on before T7 because the inactivity-episode and dismissal/reappearance logic was identified as one of the highest-risk correctness areas.

### Frontend sessions

The frontend was then built in the original U1–U7 feature structure:

1. **U1 — App shell and authentication**
   - API client
   - Auth context
   - protected routes
   - role-aware navigation
   - login/signup/logout
   - minimal admin instructor-provisioning UI

2. **U2 — Course catalog**
   - instructor and learner catalog views
   - search/filter/sort/pagination
   - learner enrollment
   - learner-specific `is_enrolled` state

3. **U3 — Instructor course detail**
   - course editing and lifecycle actions
   - lessons and reorder
   - bulk enrollment
   - CSV export
   - activity log/comments
   - instructor ownership gating

4. **U4 — Learner course detail**
   - U4 was accidentally skipped initially and was completed later before the final dashboard/alerts work.
   - Added enrollment resolution, learner lessons, completion state, progress and lifecycle-aware access.

5. **U5.5 — Instructor My Courses**
   - instructor-owned course list
   - role-specific routing through the `/my-courses` path

6. **U5 — Learner My Courses**
   - learner enrolled-course list
   - role-specific multiplexing on the same `/my-courses` path

7. **U6 — Instructor dashboard**
   - summary cards
   - course/status breakdown
   - eight-week completion chart

8. **U7 — Alerts**
   - inactivity alert list
   - dismissal
   - navigation badge
   - shared alert count through the existing `AuthContext`

### Testing

A final end-to-end audit was performed across the backend routes and frontend flows. Two backend issues and one frontend issue were found and fixed during the audit.

The final automated test run completed with 2 test suites and 23/23 tests passing.

### Documentation/finalization

After feature work, I moved to the required documentation and final submission preparation:
- `architecture.md`
- `schema.md`
- `plan.md`
- `decisions.md`
- `ai-prompts.md`
- final testing
- Git/history review
- deployment and `SUBMISSION.md`

---

## What order did you build in, and why that order?

The overall dependency-driven order was:

**T1/T2 → T3 → T4 → T5 → T6 → T8 → T7 → T9 → U1 → U2 → U3 → U5.5 → U5 → U4 → U6 → U7**

The backend came first because the frontend depends on stable API contracts and server-side business rules.

Authentication and roles were foundational, so they came first. Courses and lessons followed because enrollment, progress, activity, and learner experiences depend on them. Enrollment/progress then enabled the catalog and learner workflows. Audit logging, alerts, dashboard reporting, and CSV export were built after the underlying course/enrollment data existed.

The order was not completely linear because implementation reviews repeatedly exposed issues that were only obvious when a real consumer exercised an API.

Important corrective loops:

- T8 was intentionally handled before T7 because inactivity alerts were considered a higher-risk correctness area.
- U4 was accidentally skipped initially, then completed before U6/U7 were considered finished.
- Lesson reorder required a correctness fix to correctly reference array items during the transaction.
- Progress/activity timestamp semantics were reviewed because inactivity alerts depend on them.
- Learner catalog needed an explicit `is_enrolled` attribute.
- Learner draft-course access needed correction/clarification to ensure draft content remains unavailable even if bulk-enrolled.
- Comment authorization needed a draft-course rule to prevent leaking draft content through the activity feed.
- Frontend alert-count synchronization was simplified to use `AuthContext` instead of a custom event listener.
- Frontend integration exposed API-contract gaps that were fixed in the backend rather than worked around in the frontend.

The project therefore followed a dependency-first plan, but with corrective loops whenever actual integration showed a problem.

---

## What did you estimate versus what it actually took?

The assignment's size guide was approximately **12 hours total**, with roughly two hours per day over a week. I used that as the target while keeping the scope focused on the ten required goals.

I did not record precise elapsed time for every individual session, so I cannot honestly provide a reliable hour-by-hour estimate-versus-actual table.

In practice, more time than initially expected was spent on verification and correction rather than on writing the first implementation. Several areas that looked complete required deeper review:

- lesson reorder persistence
- comment endpoint/authorization behavior
- draft-versus-archived learner access
- learner-specific enrollment state in the catalog
- cross-course lesson-progress isolation
- alert-count state synchronization
- frontend/backend API contract checks

That extra verification time changed the schedule, but it also caught real defects that a purely feature-driven implementation would have left in place.

---

## What did you cut when you ran short?

I prioritized the ten required goals and cut optional scope rather than leaving required functionality half-finished.

The following were deliberately not built:

- email inactivity notifications or digest jobs
- polling and WebSocket-based alert updates
- quizzes
- certificates
- discussion-thread features
- prerequisites
- video/watch-progress features
- ratings/reviews
- learning paths
- downloadable lesson resources
- complex filtering/sorting/pagination for personal My Courses and Alerts pages
- deep admin analytics or full admin course management
- unnecessary dashboard drill-down functionality
- a separate frontend state-management library such as Redux

The final implementation therefore focuses on the required course, enrollment, progress, catalog, activity, dashboard, alert, and export workflows, with the frontend kept intentionally lightweight.

The main lesson from the schedule was that correctness work should not be traded away for stretch features. Several of the most valuable improvements came from testing the complete persisted or authorization result rather than only checking whether the UI appeared to work.
