# Architecture & Design Decisions

This document records the significant architectural, product, implementation, and scope decisions made during the development of the Course Delivery & Enrollment application.

The goal is to document the final decisions reflected in the implementation, especially decisions that affect behavior, authorization, data integrity, or the boundaries between features.

---

## 1. Application Architecture

### Chosen
React frontend with an Express backend, and PostgreSQL accessed through Prisma ORM. Authentication uses JWT tokens, with authorization enforced through role checks and service-level ownership/enrollment checks.

### Rejected / Alternative
Knex or replacing Prisma entirely.

### Why
This stack was chosen for speed, familiarity, its relational data model, and suitability for the assignment's scope while providing clear separation between UI, business rules, and persistence.

### Consequence
Business rules remain server-side rather than being trusted to the frontend. The frontend is primarily responsible for presentation, user interaction, and calling the existing API contracts.

---

## 2. Role Model

### Chosen
A minimal `ADMIN` role designed exclusively for instructor provisioning, alongside the core `INSTRUCTOR` and `LEARNER` roles. Public signup defaults to `LEARNER`.

### Rejected / Alternative
Allowing public registration to choose `INSTRUCTOR` freely, or building a full admin system with course/analytics management.

### Why
The original role flow could let anyone become an instructor; privileged role creation needed strict control. A full administrative suite was out of scope for the core assignment requirements.

### Consequence
The frontend contains only a small administrative provisioning surface rather than a separate full admin application. The backend still enforces the ADMIN role where privileged provisioning requires it.

---

## 3. Database and Identifier Choices

### Decision

Use PostgreSQL through Prisma, with UUID identifiers for primary keys.

The deployed PostgreSQL database is provided through Supabase.

### Reason

UUIDs are the identifier format used by the implemented schema and provide opaque identifiers suitable for API resources.

### Consequence

All frontend and backend resource references use UUID strings. Prisma migrations remain part of the repository so the same schema can be deployed consistently to the hosted database.

---

## 4. Course Lifecycle

### Chosen
A strictly enforced `DRAFT → PUBLISHED → ARCHIVED` lifecycle, with support for an `ARCHIVED → PUBLISHED` restore path. Publishing is blocked when a course contains no lessons.

### Rejected / Alternative
Arbitrary status mutation through normal course editing.

### Why
Lifecycle rules are domain rules and need server-side enforcement. It distinguishes work-in-progress content from content available to learners, while allowing an instructor to hide a published course from the catalog without destroying historical data.

### Consequence
The UI only exposes legal transitions for the current state, while the server remains authoritative and rejects illegal transitions.

---

## 5. Learner Access vs. Enrollment

### Chosen
Enrollment and content access are separate concepts. The final behavior ensures:
- A draft enrollment may exist because of bulk enrollment (useful for roster preparation).
- Draft content is not available to learners, even if bulk-enrolled.
- Published content requires an enrollment.
- Published catalog/course discovery remains available before enrollment.
- Archived courses remain available to existing enrolled learners according to the implemented behavior.

### Rejected / Alternative
Treating an enrollment record as a universal VIP pass that bypasses course lifecycle states.

### Why
Bulk enrollment needs to support roster preparation before a course is published, without prematurely exposing unfinished draft content. Archived courses were previously made available, so removing access after archival would make historical progress inaccessible.

### Consequence
A learner's enrollment record alone does not imply content access. The course lifecycle remains an independent access condition.

---

## 6. Lesson Ordering
 
### Chosen
A full rewrite of lesson positions using temporary offsets inside a database transaction.
 
### Rejected / Alternative
Naive one-by-one final position updates.
 
### Why
Safe transactional rewrite. The unique `(course_id, position)` constraint means directly swapping positions can create transient uniqueness conflicts within a transaction. Temporarily moving all rows out of the active range avoids those conflicts.
 
### Implementation Lesson
The initial reorder implementation contained a straightforward loop-body reference/copy-paste error. The loops iterated over `allLessons`, but the update body referenced the single `lesson` variable instead of `allLessons[i]`. The implementation was corrected so both phases operate on `allLessons[i]`.

The regression test was also strengthened to assert the persisted position of every lesson after movement (both upward and downward) rather than checking only the moved lesson.
 
### Consequence
Reordering is validated as a complete permutation of the course's lessons, with no duplicate or missing positions, instead of relying on a potentially misleading single-row assertion.

---

## 7. Catalog Search, Filtering, Sorting, and Pagination

### Chosen
Server-side filtering, search, sorting, and pagination. 
- Instructors see all courses.
- Learners are restricted to published courses server-side.
- Sort direction is fixed (title → ascending, creation date → descending, enrollment count → descending).
- Learner `is_enrolled` is returned explicitly for learner requests.

### Rejected / Alternative
Loading all courses and filtering/paginating in React.

### Why
Server-side processing is an assignment requirement, establishes a simpler authority boundary, and avoids loading the complete dataset into the browser merely to process it. Returning `is_enrolled` explicitly avoids UI states where a returning learner sees "Enroll" momentarily before receiving a 409 conflict.

### Consequence
Catalog requests carry server-side search/filter/sort/pagination parameters, and the frontend renders only the returned page. An enrolled learner immediately sees an `Enrolled`/`Continue` state after loading the catalog.

---


## 8. Course Status vs. Enrollment Status

### Decision

Course lifecycle status and learner enrollment/progress status are treated as separate concepts.

Course lifecycle:

- `DRAFT`
- `PUBLISHED`
- `ARCHIVED`

Learner enrollment status:

- `NOT_STARTED`
- `IN_PROGRESS`
- `COMPLETED`

A dedicated `EnrollmentStatusBadge` is used for learner progress rather than overloading the course lifecycle badge.

### Reason

The two sets of states represent different dimensions of the system and have different meanings.

### Consequence

The UI can show both the course's current lifecycle and the learner's own progress without conflating them.

---

## 9. Activity Log and Comments
 
### Chosen
A separate immutable `ActivityLog` model alongside a separate `Comment` model. Database-level PostgreSQL triggers strictly enforce activity-log immutability. Creating a comment inserts both a comment row and a corresponding activity log entry via a Prisma transaction.
 
### Rejected / Alternative
Relying only on the absence of application UPDATE/DELETE endpoints to enforce audit history.
 
### Why
The database should enforce an audit-history invariant structurally. Comments are user-generated content with a different lifecycle from an immutable historical event record.
 
### Consequence
Comment authorization is enforced server-side. The rules correctly lock down draft courses (no learner comments) while allowing enrolled learners to comment on published/archived courses.

---

## 10. Instructor Dashboard

### Decision

The instructor dashboard is a separate aggregate overview from My Courses.

Dashboard values come from the server's dashboard summary endpoint and are not recomputed by the frontend.

The completion trend is fixed to eight weeks.

### Reason

The dashboard is intended to answer "how is my content doing?" rather than act as another course-management list.

Keeping derived business metrics server-side prevents the frontend from independently recreating aggregation logic.

### Consequence

The frontend acts as a thin presentation layer for:

- total learners
- published courses
- completions this month
- learners in progress
- course/status breakdown
- eight-week completion trend

---

## 11. Inactivity Alerts

### Chosen
Query-driven alerts with episode-scoped dismissal.
An inactivity alert is generated for a learner who is:
- enrolled in one of the instructor's courses
- `IN_PROGRESS`
- inactive for more than 14 days based on the stored progress/status-change timestamp

### Rejected / Alternative
Cron jobs, background workers, polling, WebSockets, or email notifications for the core assignment.

### Why
The assignment only requires in-app alerts and the current scale does not justify background infrastructure. Episode-scoped dismissal ensures that dismissing one period of inactivity does not permanently suppress future inactivity alerts if the learner re-engages and goes dormant again.

### Consequence
The backend remains the source of truth for live alerts and dismissal state calculated dynamically when the alerts view is requested.

---

## 12. Enrollment Status and `statusChangedAt`

### Chosen
Materialize enrollment progress status (`NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`) and store the activity timestamp (`statusChangedAt`) used by inactivity logic.

### Rejected / Alternative
Dynamically calculating progress state purely from individual lesson records on every read.

### Why
Storing it is necessary for efficient progress/inactivity queries. Important: new `LessonProgress` creation updates the relevant activity timestamp even when enrollment status remains `IN_PROGRESS`. Duplicate completion does not incorrectly refresh it.

---

## 13. My Courses Separation

### Chosen
Separate instructor-owned (`MyCoursesInstructor`) and learner-enrolled (`MyCoursesLearner`) views sharing the same `/my-courses` route. Instructor My Courses manages owned courses, while learner My Courses is an overview of enrolled courses and progress. Learner My Courses is not a second catalog.

### Rejected / Alternative
Turning the catalog into a universal My Courses page.

### Why
The two roles have different goals (course management vs consumption). Keeping workflows separate prevents the personal learner view from becoming a second course-management interface or a duplicate catalog.

---

## 14. Alert Count State Synchronization

### Chosen
Shared `alertCount` state in `AuthContext`.

### Rejected / Alternative
Keeping cross-component synchronization through a browser `CustomEvent`.

### Why
`AuthContext` already exists and this is small shared React state. Using the existing context avoids a second implicit synchronization mechanism.

### Consequence
Navigation reads the count directly from Context. Alerts update the shared count after successful dismissal. No `CustomEvent` or external state library (like Redux) remains.

---

## 15. CSV Progress Export

### Chosen
Authenticated buffered CSV download using a dedicated download path/Blob handling.

### Rejected / Alternative
A bare `<a href>` for the protected endpoint or a complex streaming/reporting subsystem.

### Why
A bare anchor cannot attach the application's bearer authorization header. The assignment's scale does not strictly require stream processing.

### Consequence
The application maintains a dedicated mechanism for authenticated file responses, retrieving all necessary relational data efficiently and returning it buffered.

---

## 16. N+1 Query Avoidance

### Chosen
Prisma relational loading/aggregates for main related-data queries.

### Rejected / Alternative
Executing one request/query per learner/course/lesson where relational data can be fetched together.

### Why
Separate per-row requests would add complexity and unnecessary database/API traffic. 

### Consequence
Frontend pages consume complete, purpose-built response structures rather than reconstructing them through multiple per-item requests (e.g., `include: { progress: ... }`).

---

## 17. Security Boundary

### Chosen
Server-side role, ownership, enrollment, and lifecycle authorization.

### Rejected / Alternative
Frontend-only authorization.

### Why
Frontend controls can be bypassed through direct API calls. The backend validates authorization independently of what buttons or routes the browser displays.

---

## 18. Backend Contract Discipline

### Decision

Existing backend contracts are treated as the source of truth for frontend implementation.

Before wiring a frontend feature, the actual endpoint path, request shape, response shape, and error behavior are verified rather than assumed from an earlier design description.

### Reason

Several missing or mismatched contracts were discovered only when frontend work began. Examples included:

- the learner-specific catalog enrollment state
- comment endpoint completeness
- learner lesson-progress data needed by U4
- exact endpoint/response integrations

### Consequence

Frontend implementations are based on the implemented API rather than on stale planning documents or guessed endpoint names.

Where a genuine backend gap was found, the smallest required backend change was made and separately verified instead of inventing frontend workarounds.

---

## 19. Testing and Verification Approach

### Decision

Testing was concentrated on correctness-sensitive behavior rather than maximizing test count.

The project uses focused automated backend tests alongside manual end-to-end frontend verification.

High-risk areas receive stronger assertions, especially around:

- role and user isolation
- course ownership
- inactivity episodes and dismissal
- cross-course lesson-progress isolation
- lesson reorder persistence
- CSV correctness
- API error handling

### Reason

The most important failures in this project are not superficial rendering failures. They are cases where the application appears to work while returning incorrect data, bypassing authorization, or persisting incorrect state.

### Consequence

Verification emphasizes actual database/API state rather than relying only on UI appearance.

---

## 20. Review Lessons

### Decision

Use direct code inspection and scenario-based verification for correctness-sensitive work rather than relying solely on implementation summaries.

### Lessons

- A backend task should not be declared complete based only on a summary of what was supposedly implemented.
- Security-sensitive and data-scoping logic should be checked against the literal query/authorization code.
- Mutation tests should verify the complete persisted result, not only the row that was directly changed.
- Cross-user tests are necessary whenever data is scoped to the authenticated user.
- Cross-course tests are necessary when relational data could span multiple courses.
- Empty states and API error states must be tested separately so failures are not mistaken for legitimate zero-data conditions.
- Frontend integration can expose backend contract gaps that are invisible when backend functionality is reviewed in isolation.
- Speculative additions should be flagged as possibilities rather than silently implemented unless they serve the current requirement.
- When two independent features interact, their combined behavior needs an explicit decision rather than relying on assumptions made by either feature individually.

---

## 21. Intentional Non-Features and Scope Boundaries

The following were intentionally kept out of scope for the core assignment:

- Email-based inactivity notifications or digest jobs.
- Background polling or WebSocket-based alert updates.
- Complex filtering/sorting/pagination on the learner's personal My Courses page.
- Complex filtering/sorting/pagination on the Alerts page.
- Admin analytics.
- Full admin course-management functionality.
- Per-lesson progress details directly inside the learner My Courses overview.
- Additional dashboard drill-down functionality beyond the required aggregate view.
- Client-controlled sort directions.
- A separate state-management library for small amounts of shared frontend state.

These omissions are deliberate scope controls rather than unfinished core requirements.

---

## 22. Final Principle

The implementation favors **server-authoritative business rules, minimal frontend state, explicit role boundaries, and simple solutions at the scale required by the assignment**.

Where correctness mattered more than convenience, the implementation was strengthened with explicit authorization checks, relational data scoping, transactional writes, and tests against persisted results.

Where complexity was not justified by the assignment, it was deliberately avoided.
