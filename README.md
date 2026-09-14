# Busy Training Portal

A role-based internal training platform for course delivery, learner enrollment, progress tracking, and instructor analytics.

## Features

### Instructor
- Create, edit, publish, archive and restore courses
- Manage ordered lessons
- Enroll learners individually or in bulk
- Track learner progress
- View activity history and comments
- Monitor inactivity alerts
- Export course progress as CSV
- Create course-level MCQ quizzes

### Learner
- Browse published courses
- Self-enroll in courses
- View enrolled courses and progress
- Complete lessons and track progress
- Attempt quizzes
- Access lesson resource links
- Participate in lesson discussions

### Security & Authorization
- Server-side role-based authorization
- Course ownership checks
- Learner enrollment isolation
- Draft-course access restrictions
- Immutable activity logs at the database level

## Tech Stack

- React + Vite
- Tailwind CSS
- Node.js + Express
- Prisma
- PostgreSQL / Supabase
- JWT + bcrypt
- Zod
- Jest + Supertest

## Architecture

```text
React/Vite
    ↓
Express API
    ↓
Controllers / Services
    ↓
Prisma
    ↓
PostgreSQL (Supabase)