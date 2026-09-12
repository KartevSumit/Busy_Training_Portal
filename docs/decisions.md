# Architecture & Design Decisions

## 1. Application Architecture
The application is built using a React frontend and an Express backend, structured with service/repository layering. The backend uses Prisma ORM to interact with a PostgreSQL database. Authentication is handled via JWT tokens, and authorization is strictly role-based. 

## 2. Roles
The system requires three roles:
- **INSTRUCTOR**: Full course creation and management capabilities.
- **LEARNER**: Can consume content and manage personal enrollments.
- **ADMIN**: Kept deliberately minimal. Primarily exists for instructor provisioning. Public signup natively creates LEARNER accounts rather than allowing arbitrary instructor/admin signup. ADMIN does not function as a full course-management or analytics role.

## 3. Database / Identifier Choices
The database uses PostgreSQL via Prisma. The schema uses UUID identifiers for all primary keys. This was the implemented choice for the existing schema architecture.

## 4. Course Lifecycle
The course state machine consists of:
- **DRAFT**
- **PUBLISHED**
- **ARCHIVED**

Legal transitions are strictly enforced server-side. Publishing a course is explicitly blocked when there are no lessons. Archiving and restoring courses seamlessly preserves the underlying lessons and all associated learner enrollment history.

## 5. Enrollment Rules
Enrollment rules define how learners are assigned to courses:
- Learner self-enrollment is only allowed for PUBLISHED courses.
- Instructors have the capability to manually enroll or bulk enroll learners.
- Bulk enrollment intentionally permits instructors to pre-populate rosters into DRAFT courses.
- A learner may only have one enrollment per course.
- Enrollment progress states track learner advancement: `NOT_STARTED`, `IN_PROGRESS`, and `COMPLETED`.

**Crucially:** Bulk enrollment into a DRAFT course is roster provisioning only; it does NOT grant learner access to draft course content.

## 6. Learner Course Access
The learner access policy restricts course content strictly based on enrollment and lifecycle state:
- Non-enrolled learners cannot access course content.
- DRAFT courses return unavailable/404 to learners regardless of whether the learner has been bulk-enrolled.
- Enrolled learners retain full access to ARCHIVED courses.
- Archived access preserves the learner's existing enrollment and progress data.

Draft and archived behaviors differ intentionally: an archived course respects existing learner commitment and history, whereas a draft course has not yet been authorized by the instructor for any learner consumption.

## 7. Lesson Ordering
Lessons maintain an explicit `position` integer, governed by a `(course_id, position)` uniqueness constraint. The reorder endpoint accepts a target position for a single lesson, and the server natively recomputes the entire array ordering. 
A two-phase offset strategy (`+10000`) is utilized to circumvent transient unique-position database collisions during the splice. The frontend sequentially triggers adjacent moves and securely refetches the final authoritative server ordering rather than relying on client state.

**Implementation Lesson:**
The initial reorder implementation incorrectly referenced the single `lesson` object inside loops that were intended to operate on `allLessons[i]`. This was a straightforward loop-body reference/copy-paste error, not a JavaScript closure/scope issue. The fix changed both phases to operate strictly on the actual array element (`allLessons[i].id`), and the regression test was strengthened to assert the persisted position of every single lesson in the course after upward and downward movements.

## 8. Catalog Sorting / Pagination
Search, filter, and pagination logic are heavily server-side:
- Learners exclusively see published courses in the catalog.
- Instructors can view their courses across all states.
- Sorting direction is intentionally fixed server-side: title ASC, created_at DESC, enrollment_count DESC.
- There is intentionally no client-controlled sort-direction toggle provided in the UI.

## 9. Learner `is_enrolled` Catalog State
Catalog responses for learners were refined to natively include an `is_enrolled` boolean flag. Instructors do not receive a learner-specific `is_enrolled` field. The aggregate enrollment count remains separately available as `enrollmentCount`. The 409 `ALREADY_ENROLLED` backend rejection remains intact as defensive race-condition handling rather than acting as the primary method the UI uses to discover enrollment state.

## 10. My Courses Separation
- The Instructor "My Courses" page acts as the central hub for managing and browsing owned courses.
- The Learner "My Courses" page acts strictly as a viewer for enrolled courses and personal progress.
- These remain explicitly separate role-specific UI views.
- Per-lesson progress granular details belong on the learner Course Detail page, not crammed into the My Courses overview cards.

## 11. Status Badge Separation
Course lifecycle status (e.g., PUBLISHED) and learner enrollment status (e.g., IN_PROGRESS) are fundamentally different concepts. A separate dedicated `EnrollmentStatusBadge` component was used instead of overloading the generic course lifecycle badge.

## 12. Activity Log and Comments
Comments are stored in a standalone table, separate from the `activity_log`. Creating a comment concurrently writes a corresponding `activity_log` entry. This insertion is executed within a Prisma transaction (`$transaction`). The activity log acts as an immutable audit and history mechanism; it is not the comments table itself.

**Comment Authorization Policy:**
- The owning instructor can comment on the course.
- ADMINs follow the deliberate existing admin authorization path.
- A learner MUST be enrolled to comment.
- A learner MUST NOT be allowed to comment on DRAFT courses.
- Archived-course commenting respects the final verified implementation (enrolled learners retain interaction).

## 13. Dashboard
Dashboard statistical values are server-derived via `GET /api/dashboard/summary`. The frontend acts as a thin presentation layer and does not recompute business metrics client-side. The completion trend chart is firmly fixed at eight weeks. The Dashboard is purposefully separate from the instructor "My Courses" view.

## 14. Inactivity Alerts
Alerts are natively computed from `IN_PROGRESS` enrollments that have remained inactive for more than 14 days based on `status_changed_at`. No polling, email alerts, or background cron jobs are required for this core feature. Alert dismissal is scoped to the specific inactivity episode (`episodeStart`). If learner activity triggers a new timestamp, a fresh inactivity episode begins and the alert can validly reappear after 14 days. Instructor ownership scoping is strictly enforced server-side.

## 15. Alert State Synchronization
The navigation alert count is shared globally through the existing React `AuthContext`. 
The initial implementation used a browser `CustomEvent`, but that was deliberately replaced with `AuthContext` because the badge count is genuinely shared application state, and Context was already the project's established global-state mechanism. The alert list itself remains local to the Alerts page. No Redux, Zustand, or other state-management library was introduced, and no `CustomEvent` synchronization remains.

## 16. CSV Export
Course progress export is properly authenticated. The frontend implementation utilizes a button executing an authenticated API fetch that generates a blob download, rather than a bare unprotected anchor tag. CSV remains a dedicated response type using `text/csv` headers, preventing it from being forced through the generic JSON API response path.

## 17. N+1 Avoidance
Relational database queries were deliberately optimized using Prisma's `include` to avoid per-row N+1 requests in several critical areas:
- **Learner My Courses:** Enrollment fetching natively includes the mapped `course` entity.
- **Lesson Progress Loading:** Fetching course lessons natively includes `progress` arrays scoped strictly to the authenticated learner.
- **Dashboard Aggregation:** Single aggregated raw SQL queries determine completion trends and counts.
- **Progress CSV Export:** Prisma joins the `enrollment`, `learner`, and `lessonProgress` tables heavily in one pass before streaming CSV rows.

## 18. Testing / Verification Lessons
Testing was prioritized around high-risk mechanics:
- Focused programmatic backend tests simulating end-to-end tokenized workflows.
- Full manual verification for frontend UI flows.
- Strict cross-user isolation tests.
- Cross-course progress isolation tests mathematically proving relational integrity.
- Full-list assertions during the lesson reorder bugfix.
- Explicit empty-state vs. error-state distinction verifications.

### Review Lessons
- Don't declare a backend task complete based only on summaries.
- Inspect literal code for security-sensitive or data-scoping logic.
- Test the full persisted database result, not only the single row being mutated.
- Distinguish legitimate design decisions from speculative architectural additions.
- Use end-to-end integration checks when frontend consumers heavily expose assumptions in backend API contracts.

## 19. Known Scope / Intentional Non-Features
The following items were explicitly established as out of scope:
- Email alerts and background digest jobs.
- Alert polling or WebSockets.
- Excessive filtering, sorting, or pagination UI on personal My Courses or Alerts views.
- Deep Admin analytics or Admin course-management UI.
- Per-lesson granular detail loaded directly inside the learner My Courses list.
