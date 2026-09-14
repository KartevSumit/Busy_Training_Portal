# Submission

## Links

- **GitHub repository:** https://github.com/KartevSumit/Busy_Training_Portal
- **Live application:** https://busy-training-portal.vercel.app/

## Notes for the reviewer

The application is fully deployed and ready for review.

The frontend is hosted on Vercel, the backend on Render, and the database on Supabase PostgreSQL.

The deployed demo database is pre-populated with realistic data covering courses, lessons, enrollments, learner progress, quizzes, lesson resources, discussions/comments, activity history, dashboard metrics, inactivity alerts, and CSV export data.

The backend is hosted on Render's free tier. The service automatically spins down after a period of inactivity, so the first request after being idle may take some time while the backend starts up. Subsequent requests should respond normally once the service is awake.

## Demo credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@gmail.com | 123456 |
| Instructor | instructor@gmail.com | 123456 |
| Learner | learner@gmail.com | 123456 |

## Stack

| Layer | What you used | Why |
|-------|---------------|-----|
| Frontend | React, Vite, Tailwind CSS | Component-based UI development |
| Backend | Node.js, Express, Prisma, JWT, bcrypt, Zod | Server-side authentication, authorization, validation and business logic |
| Database | PostgreSQL (Supabase) | Relational model for courses, lessons, enrollments, progress and activity history |
| Hosting | Vercel + Render + Supabase | Simple deployment for frontend, backend and PostgreSQL |

## Goal checklist

| # | Goal | Status | Notes |
|---|------|--------|-------|
| 1 | Authentication and role-based authorization | Done | Server-enforced ADMIN, INSTRUCTOR and LEARNER boundaries |
| 2 | Course CRUD and lifecycle | Done | Draft → Published → Archived, including restore |
| 3 | Lesson management | Done | Add, edit, reorder and remove lessons with persisted ordering |
| 4 | Enrollment and learner progress | Done | Self-enrollment, instructor enrollment, bulk enrollment and persisted progress |
| 5 | Course catalog/search | Done | Server-side search, filters, sorting, pagination and enrollment state |
| 6 | Activity log and discussions/comments | Done | Immutable audit history and comments with lesson discussions |
| 7 | Instructor dashboard | Done | Summary metrics, course/progress breakdown and 8-week completion trend |
| 8 | Inactivity alerts | Done | 14+ day inactivity detection, dismissal and reappearance after later inactivity |
| 9 | CSV progress export | Done | Authenticated instructor export with progress calculations |
| 10 | Stretch features | Done | Course-level MCQ quizzes, lesson resource links and lesson discussions |

## How much time did you actually spend?

Approximately 12 hours.

## What would you do next, with another 12 hours?

I would expand frontend/E2E automated testing, further polish the UI and accessibility, and add more production-oriented observability and deployment safeguards.

## What are you least happy with in this codebase, and why?

The application was intentionally kept lightweight for the time-constrained take-home. With more time, I would focus on broader frontend/E2E coverage and additional UI/component-level refinement before introducing larger architectural abstractions.
