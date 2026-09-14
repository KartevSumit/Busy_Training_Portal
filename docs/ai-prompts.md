# AI-Prompts

This file records the significant prompts used while building the Course Delivery & Enrollment take-home assignment.

The prompts below record the instructions given to Antigravity during development, in chronological order.

The work was done incrementally so that each stage could be implemented and checked before moving to the next one. The prompts are written in the same direct, implementation-focused style used during the development sessions.

## 1. T1 + T2 — Project scaffold, database, authentication and roles

### Prompt

> Start the Course Delivery & Enrollment take-home project with React, Node.js, Express, PostgreSQL, Prisma, JWT, bcrypt and Zod.
>
> Set up the project structure, Prisma/database configuration, authentication and the initial role model. Users authenticate with email/password. Keep authorization server-side rather than relying on the frontend.
>
> The assignment requires INSTRUCTOR and LEARNER roles. Public registration must not let a user choose a privileged role.
>
> There is a problem with the normal signup flow because anyone could become an instructor. Add a minimal ADMIN role for provisioning only:
>
> - seed the initial admin from environment variables through Prisma seed
> - public registration creates LEARNER accounts only
> - the seeded ADMIN can create/provision INSTRUCTOR accounts
> - do not build a full admin application or general admin feature set
>
> Use Prisma as the database access layer and do not replace it with Knex.
>
> Keep the implementation appropriate for a roughly 12-hour take-home. Do not start the later course, enrollment, progress, dashboard, alerts or export features in this step.

### Result

The initial backend/frontend structure and authentication foundation were built around Prisma, JWT, bcrypt and Zod. The role model was extended to `ADMIN`, `INSTRUCTOR`, and `LEARNER`, with public registration restricted to learners and instructor provisioning moved behind the seeded admin.

A lightweight admin frontend was retained only for adding instructors rather than introducing a full administrative dashboard.

### Correction / Review

The important design correction happened during the initial phase: the original two-role registration model was not sufficient because an unrestricted registration flow could create instructors. The minimal admin-provisioning path was introduced instead of overbuilding an admin product.

---

## 2. T3 — Course CRUD, lifecycle and lessons

### Prompt

> Continue with T3, backend only. Inspect the current Prisma schema, migrations, Express routes/controllers/services, auth middleware, role checks, validation and error handling before making changes. Reuse the existing conventions.
>
> Implement Course CRUD and the course state machine:
>
> `DRAFT -> PUBLISHED -> ARCHIVED`
>
> and `ARCHIVED -> PUBLISHED` for restore. Do not allow arbitrary status changes through the normal course update endpoint; keep the transition rules centralized.
>
> Publishing must be rejected with HTTP 409 and a useful message such as `Cannot publish a course with no lessons` when the course contains zero lessons. Archive/restore must not delete lessons or future enrollment history.
>
> Add the Lesson model and lesson CRUD. Each lesson belongs to one course and positions are integer, contiguous and unique within the course. Creation should append to the end and calculate position on the server. Deleting a lesson must repair positions.
>
> Add:
> - POST /courses
> - GET /courses/:id
> - PATCH /courses/:id
> - POST /courses/:id/publish
> - POST /courses/:id/archive
> - POST /courses/:id/restore
> - POST /courses/:id/lessons
> - GET /courses/:id/lessons
> - PATCH /lessons/:id
> - PATCH /lessons/:id/reorder
> - DELETE /lessons/:id
>
> Enforce instructor ownership on the server for private course/lesson operations. Learners must not see draft/archived lesson content at this stage.
>
> For reorder, the database has `UNIQUE(course_id, position)`, so do not naively update positions into the final values one-by-one. Use a Prisma transaction and a two-phase strategy: first move the relevant lessons into a temporary offset range, then write the final positions 0..n-1. Load the full ordered lesson list, remove the target lesson, insert it at `newPosition`, then rewrite the final sequence.
>
> Add focused backend tests for lifecycle rules, publish-with-zero-lessons, ownership, lesson deletion/reordering and persistence. Do not modify the React frontend yet.

### Result

The course and lesson backend was implemented with explicit lifecycle transitions, ownership enforcement, lesson positioning, publish gating, and transactional reorder/delete behavior.

The API was kept role-aware and the normal course edit endpoint did not become a backdoor for changing lifecycle state.

### Problem found and correction

During review, the reorder implementation did not behave as expected. The code correctly iterated through `allLessons`, but the update body referenced the single `lesson` variable instead of the lesson at `allLessons[i]`. As a result, the transaction could repeatedly update the same row rather than rewriting each row's position.

### Follow-up prompt

> Inspect the reorder transaction carefully. The two-phase strategy is correct conceptually, but the loop body is updating the wrong lesson object.
>
> In both phases, update the actual lesson at the current index (`allLessons[i]`) rather than the single requested `lesson` variable.
>
> Do not redesign the reorder algorithm. Keep the temporary-offset phase and the final contiguous rewrite.
>
> Add/strengthen a regression test that persists a multi-lesson course, moves a lesson upward, then downward, and verifies the positions of **every lesson in the database**, not only the lesson that was moved.

### Result / review

The update loops were corrected to operate on `allLessons[i]`. The regression test was strengthened to check the complete persisted sequence for both upward and downward moves.

This was a straightforward loop-body/copy-paste mistake, not a JavaScript closure or variable-scope problem.

---

## 3. T4 — Enrollment and learner progress

### Prompt

> Implement T4 backend enrollment and learner progress.
>
> Add the Enrollment join model with one row per learner/course pair and a unique `(learnerId, courseId)` constraint. Learners can self-enroll only in published courses. Instructors can enroll learners and can bulk-enroll from an email list.
>
> Bulk enrollment should return one result per submitted address:
> - `unknown`
> - `already_enrolled`
> - `enrolled`
>
> Keep the operation transactional and reuse the same enrollment creation logic for individual and bulk enrollment where practical.
>
> Add LessonProgress with a unique `(enrollmentId, lessonId)` pair. A learner completing a lesson should go through one backend write path that:
> 1. validates the learner/enrollment/course/lesson relationship
> 2. creates the lesson-progress row if it does not already exist
> 3. derives enrollment status from completed lessons
> 4. moves status only through NOT_STARTED -> IN_PROGRESS -> COMPLETED
>
> Repeated completion of an already completed lesson should not create another progress row and should not incorrectly refresh the progress activity timestamp.
>
> Keep `statusChangedAt` meaningful for inactivity detection: creation of a new progress row counts as progress even if the enrollment remains IN_PROGRESS; repeating an existing completion does not.
>
> Add the learner My Courses endpoint. It must query only the authenticated learner's enrollments and should include the related course in the same relational query rather than creating an N+1 request pattern.

### Result

Enrollment, per-lesson progress and derived enrollment status were added. Bulk enrollment returned per-email outcomes and learner-owned enrollment queries were kept scoped to the authenticated user.

The progress model used a unique enrollment/lesson pair so that a learner could not accumulate duplicate progress rows for the same lesson.

### Correction / Review

One subtle issue was the meaning of the activity timestamp used by inactivity alerts.

The correct behavior is that creating a **new** lesson-progress row changes the progress activity timestamp, even if the enrollment status string itself stays `IN_PROGRESS`. Repeating a completion for an already completed lesson must not artificially move the timestamp forward.

That distinction was important because the alert feature depends on “last real progress,” not merely “last time this endpoint was called.”

---

## 4. T5 — Course catalog and server-side search

### Prompt

> Implement T5, the course catalog/search endpoint.
>
> The endpoint must support server-side:
> - text search over course title and description
> - category filter
> - status filter
> - instructor filter
> - sorting by title, creation date and enrollment count
> - pagination with total count
>
> Do all filtering, sorting and pagination in the Prisma/database query. Do not fetch the whole catalog into memory and filter it in JavaScript.
>
> Learners must only receive PUBLISHED courses. This condition must be enforced server-side even if the frontend sends no status filter. Instructors may see DRAFT, PUBLISHED and ARCHIVED courses, with an optional instructor filter.
>
> Include the enrollment count for each course. Keep the query efficient and avoid N+1 work.
>
> Use fixed sort directions:
> - title ASC
> - creation date DESC
> - enrollment count DESC
>
> Do not add a sort-direction parameter unless it already exists in the established API.
>
> Also make the learner catalog return a per-course `is_enrolled` value for the authenticated learner when appropriate. Keep the total `enrollmentCount` separate from that learner-specific boolean.
>
> Preserve the existing error/validation conventions and add focused tests for search in title and description, filters, sorting, pagination, instructor isolation and learner visibility.

### Result

The catalog was built as a server-side query rather than a client-side filtering layer. The response included enrollment counts and the role-specific visibility rules.

The API also exposed whether the current learner was already enrolled so the catalog could render the correct action.

### Correction / Review

A later review identified that learners needed a direct enrollment-state field rather than making the frontend infer enrollment from unrelated data. `is_enrolled` was added for learners.

Sorting was also deliberately kept simple and deterministic: title ascending, newest creation date first, and enrollment count descending. No sort-direction control was added because it was unnecessary for the assignment.

A defensive `409 ALREADY_ENROLLED` path was retained for concurrent enrollment attempts even though the normal UI checks `is_enrolled` first.

---

## 5. T6 — Activity log and comments

### Prompt

> Implement T6 activity logging and comments.
>
> Add an ActivityLog model that records course creation, course edits, publish/archive/restore transitions and comment activity. Store the actor, course, action type, details and creation timestamp.
>
> The activity log is an audit history, not editable content. It must be immutable even to instructors. Do not rely only on "there is no update endpoint"; add a PostgreSQL-level BEFORE UPDATE OR DELETE protection through the migration so the database itself rejects mutations.
>
> Add Comment as a separate model. Creating a comment should persist the comment and the corresponding COMMENT_ADDED activity entry in the same Prisma transaction.
>
> Enforce server-side authorization:
> - owning instructor can comment on their course
> - learner must be enrolled
> - learners must not be able to use a draft course as an interactive surface
> - keep the deliberate ADMIN path already used by the project
>
> Activity retrieval must be scoped so a non-owning instructor cannot read another instructor's private course history.
>
> Keep the existing architecture and do not modify unrelated frontend code. Add focused tests for activity creation, comment authorization and database immutability.

### Result

The activity log and comment model were added. Comment creation and its corresponding activity entry were handled transactionally.

Activity history was protected at the database level with PostgreSQL immutability triggers rather than relying only on application code never exposing update/delete endpoints.

### Correction / Review

Comment authorization required a later clarification because bulk enrollment can create roster entries independently of normal learner self-enrollment.

The final rule distinguishes enrollment from course visibility: learners need to be enrolled to comment, but they must not be allowed to comment on a draft course. Archived courses remain available to learners who already have enrollment history.

That prevents a draft course from accidentally exposing an interactive path simply because someone was bulk-enrolled into it.

---

## 6. T7 — Instructor dashboard

### Prompt

> Implement T7, the instructor dashboard backend.
>
> Add one instructor-only summary endpoint that returns:
> - total learners
> - published courses
> - completions this month
> - learners currently in progress
> - enrollment/progress breakdown by course
> - completion trend for the last 8 weeks
>
> Calculate the metrics on the backend. Prefer aggregate/raw SQL where it gives a clear query without turning the application into a collection of per-row queries.
>
> Define the date boundaries explicitly:
> - current calendar month for "completions this month"
> - eight Monday-starting weekly buckets for the trend
>
> Every result must be scoped to the authenticated instructor's courses. One instructor must never see another instructor's private course/enrollment data.
>
> An instructor with no courses or no activity should receive a valid empty/zero-valued dashboard rather than an error.
>
> Add focused tests for each metric, the eight-week trend boundaries, empty data and instructor isolation.

### Result

The dashboard backend was built around four headline metrics, course/progress breakdown data and eight Monday-based weekly buckets for the completion trend.

The implementation was kept instructor-scoped and the empty dashboard remained a valid result rather than an error.

### Correction / Review

The main review focus here was semantic correctness rather than UI complexity: month boundaries, week boundaries, and instructor isolation matter more than adding extra dashboard features.

The frontend later consumed the already-aggregated endpoint instead of rebuilding the metrics from raw enrollment/progress data.

---

## 7. T8 — Inactivity alerts

### Prompt

> Implement T8 inactivity alerts.
>
> An alert exists when an enrollment is `IN_PROGRESS` and the learner has made no new progress for more than 14 days.
>
> Do not create a cron/background worker. Calculate current alerts when the instructor requests the alert list/count.
>
> Dismissal must identify the specific learner/course inactivity episode, not permanently hide that learner forever. If the learner later makes new progress and then becomes inactive again for another 14+ days, that later episode must be eligible to appear again.
>
> Use the existing progress timestamp semantics from T4. In particular, a newly created LessonProgress row is real progress even when enrollment status stays IN_PROGRESS; duplicate completion of an already completed lesson must not keep resetting inactivity.
>
> Add alert listing, alert count and dismissal endpoints. Scope all alert results to the authenticated instructor's courses.
>
> Prevent learners or another instructor from reading or dismissing another instructor's alerts.
>
> Add focused tests for:
> - active in-progress learner
> - exactly/over 14-day boundary
> - completed and not-started enrollments
> - dismissal
> - new inactivity episode after re-engagement
> - instructor isolation
> - no cross-learner leakage.

### Result

The alert model was implemented as a query-driven view of current progress/inactivity plus dismissals. Alert episodes were tied to the progress activity timestamp rather than using a permanent “seen” flag.

The instructor UI could dismiss a specific learner/course alert, while later activity could make a new inactivity episode appear again.

### Correction / Review

This feature exposed why the T4 timestamp semantics mattered. Updating the timestamp only when the enrollment status string changed would incorrectly leave some real progress looking stale. The final behavior updates the timestamp when a **new** lesson-progress record is created, while duplicate completion does not refresh it.

The design deliberately avoided background processing because live query evaluation was sufficient at this assignment's scale.

---

## 8. T9 — CSV progress export

### Prompt

> Implement T9, authenticated course progress CSV export.
>
> Add an instructor-only endpoint that exports one CSV row for every learner enrolled in the course.
>
> Columns should include:
> - learner email
> - course title
> - status
> - enrolled_at
> - status_changed_at
> - completed_lessons
> - total_lessons
> - progress_percentage
>
> The export must include learners with zero progress. If the course has zero lessons, progress percentage must be 0 rather than causing a divide-by-zero problem.
>
> Keep ownership strict: only the instructor who owns the course can export it.
>
> Handle CSV quoting/escaping correctly for commas, quotes and newlines. Use deterministic learner-email ordering.
>
> Use relational Prisma data rather than issuing an application-level query for each learner. Keep the implementation buffered/in-memory because streaming is unnecessary for this assignment's expected scale.
>
> Add focused tests for authorization, row completeness, zero-lesson courses, archived courses, progress calculation, deterministic ordering and CSV escaping.

### Result

A dedicated authenticated CSV download was added. The export was generated from relational data rather than making repeated requests per learner.

The zero-lesson case returns `0%` rather than dividing by zero, and the output has deterministic learner ordering and proper CSV escaping.

### Correction / Review

The implementation stayed intentionally simple for the size of the assignment. No streaming infrastructure or general-purpose reporting system was introduced.

---

# Frontend

## 9. U1 — API client, authentication state and application shell

### Prompt

> Implement U1 frontend foundation using plain JavaScript, React and Tailwind CSS.
>
> First inspect the existing frontend and the actual backend auth endpoints/contracts.
>
> Build a shared `apiClient.js` around fetch. It should:
> - attach the bearer token
> - parse normal JSON success responses
> - turn JSON HTTP errors into a useful ApiError
> - handle non-JSON HTTP errors with a fallback message
> - distinguish network/fetch failures
> - centrally handle 401 by clearing the session/logging out
>
> Build AuthContext for authentication/session state. Restore the session on page load and make protected routes wait until auth initialization completes so the app does not redirect prematurely.
>
> Add login, learner-only signup, logout and role-aware navigation. Support ADMIN, INSTRUCTOR and LEARNER.
>
> Add a small Admin Dashboard so the seeded admin can provision instructors. Do not build general admin course management/analytics.
>
> Use protected routes for role-aware pages, but keep server-side authorization as the actual security boundary.
>
> Do not use Redux, React Query or another state-management library. Do not build the feature pages yet; leave placeholders for the later U2-U7 work.
>
> Avoid creating a circular dependency between apiClient and AuthContext.

### Result

The frontend received a shared `apiClient`, `ApiError` handling and authentication state through `AuthContext`.

The application shell was made role-aware, with protected routes and logout behavior. The design deliberately kept authorization enforcement on the backend rather than treating frontend route hiding as security.

### Correction / Review

A major constraint during this stage was avoiding an API-client/AuthContext circular dependency. The final structure kept those responsibilities separated rather than making the HTTP layer depend directly on React state.

### Problem found: passwords were always hidden

After the authentication/admin UI was in place, a concrete usability problem was identified:

> “Problem passwords were always hidden”

### Follow-up prompt

> Fix only the password field in the Admin Dashboard's "Add Instructor" form.
>
> Keep the password hidden by default. Add an inline SVG eye button on the right side of the input. Clicking it should toggle between `type="password"` and `type="text"`.
>
> Give the button an accessible label/title such as "Show password" and "Hide password". Keep the icon aligned with the existing input styling.
>
> Do not change password validation, the API request, form submission, or backend authentication. Do not add an icon library just for this. Only modify the relevant frontend form code.

### Result / review

The change was intentionally kept local to the password input. It added the visibility toggle without altering the credential-handling path.

---

## 10. U2 — Catalog UI

### Prompt

> Connect the existing course catalog page to the real backend catalog endpoint.
>
> Support search, category/status/instructor filters, sorting and pagination using the backend query parameters. Do not duplicate the filtering logic on the client.
>
> Show the correct actions for learners versus instructors.

### Result

The frontend catalog was connected to the server-side catalog behavior and used the backend result set, total count and enrollment state.

The learner experience remained published-course-only, while instructor access reflected the broader server-side catalog.

### Correction / Review

The main review point was to keep the frontend contract aligned with the backend rather than inventing a second set of query parameters or client-side filtering rules.

---

## 11. U3 — Instructor course detail

### Prompt

> Build the instructor version of `/courses/:id`.
>
> Use the existing backend APIs for editing course metadata, publishing/archiving/restoring, lesson CRUD and reorder, bulk enrollment, CSV export, activity history and comments.
>
> Reuse the backend response shapes. Keep ownership checks on the server and treat any frontend ownership check as UX only.

### Result

The instructor course-detail page became the main place to manage a course. It included lifecycle actions, lesson editing/reordering, enrollment tools, CSV export, activity log and comments.

Lesson reordering refetched the ordered list after a move instead of trying to maintain a separate local ordering model.

### Correction / Review

The course-detail work surfaced several places where the frontend had to follow backend semantics instead of reimplementing them. In particular, publish failures had to surface the server's actual business-rule error and not be replaced by a generic success/failure message.

---

## 12. U5.5 — Instructor “My Courses”

### Prompt

> Add an instructor-only “My Courses” page that shows courses owned by the current instructor across all lifecycle states.
>
> Do not fake this by downloading the global catalog and filtering it in React. Use the owner's course query and link each row to the existing course-detail page.

### Result

A separate instructor “My Courses” page was added for owned courses, including draft, published and archived courses. Course creation was also exposed there and linked back into the main instructor detail page.

### Correction / Review

The design intentionally kept this separate from the catalog because the two pages answer different questions: one is discovery, the other is ownership and management.

---

## 13. U5 — Learner “My Courses”

### Prompt

> Replace the learner placeholder with a real enrolled-course list.
>
> Use the existing learner enrollment endpoint, include the joined course data in the backend query and do not create an N+1 request pattern from the frontend.
>
> Keep it simpler than the catalog: show enrollment/status/progress information and link into the learner course detail page.

### Result

The learner “My Courses” view became a dedicated list of the authenticated learner's enrollments. It did not duplicate the catalog search/filtering system.

The backend query returned course/enrollment information together so the frontend did not need one request per course.

### Correction / Review

Isolation was explicitly checked with more than one learner so that the page could not accidentally expose another learner's enrollments or progress.

---

## 14. U4 — Learner course detail and persisted progress

### Prompt

> Implement the learner side of `/courses/:id` without breaking the instructor version.
>
> A learner who is not enrolled should see the published course and be able to enroll. An enrolled learner should see the ordered lessons and their own persisted completion state.
>
> Draft courses must not become accessible just because an enrollment row exists. Archived courses should remain accessible to learners with existing enrollment history.
>
> Keep progress scoped to the current enrollment and course. Test direct URL access, enrollment, completion persistence and multiple users/courses.

### Result

The learner route was separated from the instructor experience while continuing to use the same course-detail URL.

The final access rules were:

- draft: inaccessible to learners,
- published + enrolled: accessible with progress,
- published + not enrolled: visible with enrollment action,
- archived + existing enrollment: accessible so history/progress are retained.

### Correction / Review

This phase required a number of security and data-isolation checks.

One important validation used a learner enrolled in two different courses, with progress completed in both. The purpose was to ensure that lesson-progress queries stayed scoped to the correct enrollment/course and could not leak or mark lessons across courses.

### Problem found: draft courses were visible to learners

The prompt history contains an explicit later problem report:

> “problem - Draft were also visible to students”

The follow-up investigation focused on the interaction between bulk enrollment and course visibility. Bulk enrollment could create an enrollment row before a course was published, so checking only whether a learner was enrolled was not sufficient to decide whether the learner could interact with the course.

The correction was to make learner access depend on both conditions:
- the course must be `PUBLISHED`
- the learner must be enrolled

That rule was also applied to learner commenting, with a focused authorization test proving that an enrolled learner on a draft course receives `403`. Archived-course behavior was explicitly checked rather than silently changed.

This was treated as a server-side authorization issue, not just a frontend visibility issue.

---

## 15. U6 + U7 — Dashboard and alerts frontend

### Prompt

> Finish the instructor dashboard and inactivity-alert UI using the existing backend endpoints.
>
> Dashboard: four headline cards, course/status breakdown, eight-week completion trend, and proper loading/empty/error states.
>
> Alerts: instructor-only alert list, dismissal, human-readable inactivity duration and a navigation badge.
>
> Keep state handling simple and reuse existing app-level auth state where appropriate. Do not add polling/websocket infrastructure.

### Result

The dashboard was implemented with the four headline metrics, course/status breakdown and an eight-week Recharts trend.

The alerts page included dismiss controls and the navigation badge. Alert count was held in `AuthContext` so the shell could display it without a separate event-bus mechanism.

### Correction / Review

The alert badge synchronization was simplified during implementation. An earlier local/custom-event style of cross-component synchronization was replaced with the existing `AuthContext` state so there was one straightforward app-level source of truth.

The final alert list still owns its local loading/error/dismiss state, while the global shell only needs the count.

---


---

## 16. Stretch — Quizzes, lesson resources and lesson discussions

### Prompt

> Add three small stretch features without disturbing the completed core application: course-level MCQ quizzes, optional resources on lessons, and a simple discussion/comment area for each lesson.
>
> Quizzes should be first-class course content rather than being attached to lessons. An instructor can create a quiz and manage four-option multiple-choice questions with one correct option. Learners can answer and submit the quiz, with the server calculating the score. Never expose the correct option in learner-facing quiz data. Keep the quiz scope deliberately small; no timers, attempts, question randomization or other full quiz-engine features.
>
> Add an optional resource link to lessons using a URL and an optional display name. A URL may exist without a name, but a name must never exist without a URL. This is only a resource link, not a file-upload or storage system.
>
> Add a simple discussion section to each lesson using the existing comment infrastructure. Anyone who is allowed to access the lesson should be able to post a comment according to the existing course access rules. Keep it flat: no replies or nested threads.
>
> Reuse the existing authentication, authorization, Comment and ActivityLog patterns. Add focused backend tests for the new behavior and keep all existing required functionality working.

### Result

The three stretch features were added without changing the existing course/lesson architecture:

- **Quizzes** became first-class course content with dedicated quiz/question models and instructor and learner flows. Quiz answers are evaluated on the server, while the stored correct option is kept out of learner-facing quiz responses.
- **Lesson resources** were added as optional `resourceUrl` and `resourceName` fields. The URL can be used by itself; a resource name is accepted only when a URL is present. Learners see the saved resource as a link.
- **Lesson discussions** were added as simple flat comments attached to lessons, reusing the existing Comment and ActivityLog infrastructure. There is no reply or nested-thread model.

The new functionality followed the existing role and course-access rules, including instructor ownership checks, learner enrollment checks, draft-course restrictions and retained access for enrolled learners on archived courses.

### Correction / Review

The stretch work was intentionally kept small rather than becoming three separate subsystems. Quizzes remained MCQ-only, resources remained URL-based, and lesson discussions remained a flat comment section. Dedicated frontend/backend modules were then used where the new code needed clearer separation from the existing course and lesson components.

Focused Supertest coverage was added for quiz authorization/scoring, resource validation and persistence, and lesson discussion authorization/isolation. The stretch code was then separated into dedicated frontend/backend modules where appropriate without changing its behavior or API contracts.

---

# Final Audit, Testing and Cleanup

## Prompt

> Do a final audit of the completed application after the feature work. Inspect every backend route and the major frontend flows, checking authentication, authorization, ownership, lifecycle rules, validation, database behavior, frontend/backend contracts and important edge cases. Look specifically for IDOR or privilege-escalation issues rather than assuming existing role checks are sufficient.
>
> Create meaningful Jest/Supertest coverage for the important backend behavior and keep the tests in the repository. Verify important persisted database state, not only HTTP status codes. Also inspect the frontend for genuine integration or navigation problems. After the audit, clean up any confirmed temporary or redundant implementation files without changing behavior.

## Result

The final audit inspected 23 backend routes across the existing controller groups and the major frontend pages, components and flows. It identified and corrected three application issues: learner access to draft-course progress, archived-course commenting, and an instructor catalog navigation problem.

The audit also verified the three stretch features and their authorization boundaries.

A final repository-wide cleanup removed temporary patch/iteration scripts left from implementation and corrected a duplicated learner quiz rendering block. The Prisma schema was also cleaned of an unused quiz-to-user relation from an earlier draft. Historical migrations were retained.

## Automated testing

The final repository used Jest + Supertest with three test suites, including the existing inactivity coverage, backend audit coverage and stretch-feature coverage.

Final command:

    npm run test

Final result:

```text
Test Suites: 3 passed, 3 total
Tests:       42 passed, 42 total
Snapshots:   0 total
Ran all test suites.
```

The tests cover the core authorization and business-rule boundaries as well as stretch functionality such as quiz scoring/authorization, resource validation and persistence, and lesson discussion authorization/isolation.

## Testing issues and corrections

### Learner draft-course access

A learner who had been bulk-enrolled into a DRAFT course could potentially call the lesson-completion endpoint directly if the lesson ID was known. The progress controller was checking enrollment but not the course status.

The controller was corrected to verify the lesson's course status and reject DRAFT content, with regression coverage added for the case.

### Archived-course comments

Enrolled learners could not comment on ARCHIVED courses because the comment authorization check only allowed PUBLISHED courses. The condition was corrected to allow appropriately enrolled learners on both PUBLISHED and ARCHIVED courses.

### Instructor catalog navigation

Instructors could click another instructor's course and reach an edit route that correctly returned 403, but the frontend flow was confusing. The course card was corrected to link to the edit page only for courses owned by the current instructor.

### Test isolation

The first audit run attempted to delete ActivityLog records during cleanup. PostgreSQL correctly rejected this because activity logs are intentionally immutable. The test isolation strategy was changed to use unique test data instead of deleting immutable activity records, without disabling the database protection.

## Review

The final audit and cleanup were used to verify the completed implementation rather than to expand the scope further. The final test suite passed 42/42 tests, and the frontend production build also completed successfully.

# Overall development approach

The prompt history shows a deliberately staged workflow rather than asking an AI to generate the entire application in one pass.

The prompt-history sequence and the actual implementation order were not identical.

The raw history contains T7 material before the later T8 prompt, but the working implementation order deliberately handled T8 before T7 because inactivity episodes/dismissal/reappearance were considered a higher-risk correctness area.

The major implementation order was:

`T1/T2 → T3 → T4 → T5 → T6 → T8 → T7 → T9 → U1 → U2 → U3 → U5.5 → U5 → U4 → U6/U7`

The raw prompt history places the T7 material before the later T8 material, but the working plan deliberately handled T8 before T7 because inactivity episodes and dismissal/reappearance were considered the higher-risk correctness area.

The backend/domain rules were built first and the frontend was then connected to those contracts. Several later frontend tasks revisited backend semantics where necessary, especially around access control and persisted progress.

The most useful AI-assisted work was not simply generating CRUD code. The prompts repeatedly asked the AI to inspect existing code, preserve existing conventions, keep business rules on the server, and write focused tests around risky areas.

Several implementation decisions were also intentionally kept small because this was a roughly 12-hour take-home: there was no full admin product, no background alert worker, no websocket/polling system, no streaming CSV service and no unnecessary abstraction layer.

The important lesson from the development was that generated code still needed active review. The lesson reorder loop bug, progress/inactivity timestamp semantics, learner draft access, cross-course progress isolation, comment authorization and frontend alert-state synchronization all required checking the actual behavior rather than assuming the first implementation was correct.
