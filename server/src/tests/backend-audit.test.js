const request = require('supertest');
const app = require('../index');
const prisma = require('../db/prisma');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const createToken = (id, email, role) => jwt.sign({ id, email, role }, process.env.JWT_SECRET || 'supersecret123');

describe('Backend Audit Tests', () => {
  jest.setTimeout(60000);

  let admin, inst1, inst2, learner1, learner2;
  let adminToken, inst1Token, inst2Token, learner1Token, learner2Token;

  beforeAll(async () => {

    const pwd = await bcrypt.hash('password123', 10);
    const ts = Date.now();

    admin = await prisma.user.create({ data: { email: `admin_${ts}@t.com`, password: pwd, role: 'ADMIN' } });
    inst1 = await prisma.user.create({ data: { email: `inst1_${ts}@t.com`, password: pwd, role: 'INSTRUCTOR' } });
    inst2 = await prisma.user.create({ data: { email: `inst2_${ts}@t.com`, password: pwd, role: 'INSTRUCTOR' } });
    learner1 = await prisma.user.create({ data: { email: `learner1_${ts}@t.com`, password: pwd, role: 'LEARNER' } });
    learner2 = await prisma.user.create({ data: { email: `learner2_${ts}@t.com`, password: pwd, role: 'LEARNER' } });

    adminToken = createToken(admin.id, admin.email, admin.role);
    inst1Token = createToken(inst1.id, inst1.email, inst1.role);
    inst2Token = createToken(inst2.id, inst2.email, inst2.role);
    learner1Token = createToken(learner1.id, learner1.email, learner1.role);
    learner2Token = createToken(learner2.id, learner2.email, learner2.role);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('1. Authentication / Authorization', () => {
    let testCourse;
    beforeAll(async () => {
      testCourse = await prisma.course.create({
        data: { title: 'Auth Course', category: 'Test', instructorId: inst1.id, status: 'PUBLISHED' }
      });
    });

    test('unauthenticated request is rejected', async () => {
      await request(app).get('/api/courses').expect(401);
    });

    test('learner cannot access instructor APIs', async () => {
      await request(app).post('/api/courses').set('Authorization', `Bearer ${learner1Token}`).send({ title: 'T', category: 'C' }).expect(403);
      await request(app).get(`/api/courses/${testCourse.id}/activity`).set('Authorization', `Bearer ${learner1Token}`).expect(403);
      await request(app).post(`/api/courses/${testCourse.id}/lessons`).set('Authorization', `Bearer ${learner1Token}`).send({ title: 'L', content: 'C' }).expect(403);
    });

    test('instructor cannot modify another instructors course', async () => {
      await request(app).patch(`/api/courses/${testCourse.id}`).set('Authorization', `Bearer ${inst2Token}`).send({ title: 'Hacked' }).expect(403);
    });
  });

  describe('2. Course Lifecycle & Learner Access', () => {
    let course;
    test('create course (DRAFT initially)', async () => {
      const res = await request(app).post('/api/courses').set('Authorization', `Bearer ${inst1Token}`).send({ title: 'LC Course', category: 'LC' }).expect(201);
      course = res.body.course;
      expect(course.status).toBe('DRAFT');
    });

    test('learner cannot access DRAFT course content', async () => {
      await request(app).get(`/api/courses/${course.id}`).set('Authorization', `Bearer ${learner1Token}`).expect(404);
      await request(app).get(`/api/courses/${course.id}/lessons`).set('Authorization', `Bearer ${learner1Token}`).expect(404);
    });

    test('publishing with zero lessons is rejected', async () => {
      await request(app).post(`/api/courses/${course.id}/publish`).set('Authorization', `Bearer ${inst1Token}`).expect(409);
      const dbCourse = await prisma.course.findUnique({ where: { id: course.id } });
      expect(dbCourse.status).toBe('DRAFT');
    });

    test('add lesson and publish', async () => {
      const lessonRes = await request(app).post(`/api/courses/${course.id}/lessons`).set('Authorization', `Bearer ${inst1Token}`).send({ title: 'L1', content: 'C1' }).expect(201);
      await request(app).post(`/api/courses/${course.id}/publish`).set('Authorization', `Bearer ${inst1Token}`).expect(200);
      const dbCourse = await prisma.course.findUnique({ where: { id: course.id } });
      expect(dbCourse.status).toBe('PUBLISHED');
    });

    test('learner can discover PUBLISHED courses', async () => {
      const res = await request(app).get(`/api/courses?q=LC`).set('Authorization', `Bearer ${learner1Token}`).expect(200);
      expect(res.body.data.some(c => c.id === course.id)).toBe(true);
    });

    test('archive course and test learner access if previously enrolled', async () => {
      await request(app).post(`/api/courses/${course.id}/enroll`).set('Authorization', `Bearer ${learner1Token}`).expect(201);
      await request(app).post(`/api/courses/${course.id}/archive`).set('Authorization', `Bearer ${inst1Token}`).expect(200);

      const dbCourse = await prisma.course.findUnique({ where: { id: course.id } });
      expect(dbCourse.status).toBe('ARCHIVED');

      await request(app).get(`/api/courses/${course.id}`).set('Authorization', `Bearer ${learner1Token}`).expect(200);

      await request(app).get(`/api/courses/${course.id}`).set('Authorization', `Bearer ${learner2Token}`).expect(404);
    });
  });

  describe('3. Lessons & Reordering', () => {
    let rCourse, l1, l2, l3;
    beforeAll(async () => {
      const res = await request(app).post('/api/courses').set('Authorization', `Bearer ${inst1Token}`).send({ title: 'Reorder Course', category: 'RC' });
      rCourse = res.body.course;
      l1 = (await request(app).post(`/api/courses/${rCourse.id}/lessons`).set('Authorization', `Bearer ${inst1Token}`).send({ title: 'L0', content: 'C' })).body.lesson;
      l2 = (await request(app).post(`/api/courses/${rCourse.id}/lessons`).set('Authorization', `Bearer ${inst1Token}`).send({ title: 'L1', content: 'C' })).body.lesson;
      l3 = (await request(app).post(`/api/courses/${rCourse.id}/lessons`).set('Authorization', `Bearer ${inst1Token}`).send({ title: 'L2', content: 'C' })).body.lesson;
    });

    test('reorder downward and verify all positions', async () => {
      await request(app).patch(`/api/lessons/${l1.id}/reorder`).set('Authorization', `Bearer ${inst1Token}`).send({ newPosition: 2 }).expect(200);

      const lessons = await prisma.lesson.findMany({ where: { courseId: rCourse.id }, orderBy: { position: 'asc' } });
      expect(lessons[0].id).toBe(l2.id); expect(lessons[0].position).toBe(0);
      expect(lessons[1].id).toBe(l3.id); expect(lessons[1].position).toBe(1);
      expect(lessons[2].id).toBe(l1.id); expect(lessons[2].position).toBe(2);
    });
  });

  describe('4. Enrollment & Progress', () => {
    let pCourse, pLesson1, pLesson2;
    beforeAll(async () => {
      pCourse = (await request(app).post('/api/courses').set('Authorization', `Bearer ${inst2Token}`).send({ title: 'Progress Course', category: 'PC' })).body.course;
      pLesson1 = (await request(app).post(`/api/courses/${pCourse.id}/lessons`).set('Authorization', `Bearer ${inst2Token}`).send({ title: 'L1', content: 'C' })).body.lesson;
      pLesson2 = (await request(app).post(`/api/courses/${pCourse.id}/lessons`).set('Authorization', `Bearer ${inst2Token}`).send({ title: 'L2', content: 'C' })).body.lesson;
      await request(app).post(`/api/courses/${pCourse.id}/publish`).set('Authorization', `Bearer ${inst2Token}`);
    });

    test('learner self-enrollment', async () => {
      const res = await request(app).post(`/api/courses/${pCourse.id}/enroll`).set('Authorization', `Bearer ${learner1Token}`).expect(201);
      expect(res.body.enrollment.status).toBe('NOT_STARTED');
    });

    test('duplicate enrollment fails', async () => {
      await request(app).post(`/api/courses/${pCourse.id}/enroll`).set('Authorization', `Bearer ${learner1Token}`).expect(409);
    });

    test('bulk enrollment by instructor', async () => {
      const res = await request(app).post(`/api/courses/${pCourse.id}/enroll-bulk`).set('Authorization', `Bearer ${inst2Token}`).send({ emails: [learner2.email, 'unknown@xyz.com', learner1.email] }).expect(200);
      const results = res.body.results;
      expect(results.find(r => r.email === learner2.email).outcome).toBe('enrolled');
      expect(results.find(r => r.email === 'unknown@xyz.com').outcome).toBe('unknown');
      expect(results.find(r => r.email === learner1.email).outcome).toBe('already_enrolled');
    });

    test('progress transitions and timestamp', async () => {
      const initialEnrollment = await prisma.enrollment.findUnique({ where: { learnerId_courseId: { learnerId: learner1.id, courseId: pCourse.id } } });
      const t1 = initialEnrollment.statusChangedAt;

      await request(app).post(`/api/lessons/${pLesson1.id}/complete`).set('Authorization', `Bearer ${learner1Token}`).expect(200);
      const midEnrollment = await prisma.enrollment.findUnique({ where: { id: initialEnrollment.id } });
      expect(midEnrollment.status).toBe('IN_PROGRESS');
      expect(midEnrollment.statusChangedAt.getTime()).toBeGreaterThan(t1.getTime());

      const t2 = midEnrollment.statusChangedAt;
      await request(app).post(`/api/lessons/${pLesson1.id}/complete`).set('Authorization', `Bearer ${learner1Token}`).expect(200);
      const dupEnrollment = await prisma.enrollment.findUnique({ where: { id: initialEnrollment.id } });
      expect(dupEnrollment.statusChangedAt.getTime()).toBe(t2.getTime());

      await request(app).post(`/api/lessons/${pLesson2.id}/complete`).set('Authorization', `Bearer ${learner1Token}`).expect(200);
      const finalEnrollment = await prisma.enrollment.findUnique({ where: { id: initialEnrollment.id } });
      expect(finalEnrollment.status).toBe('COMPLETED');
    });
  });

  describe('5. Comments & Activity Log', () => {
    let aCourse;
    beforeAll(async () => {
      aCourse = (await request(app).post('/api/courses').set('Authorization', `Bearer ${inst1Token}`).send({ title: 'Activity Course', category: 'AC' })).body.course;
      await request(app).post(`/api/courses/${aCourse.id}/lessons`).set('Authorization', `Bearer ${inst1Token}`).send({ title: 'L1', content: 'C' });
      await request(app).post(`/api/courses/${aCourse.id}/publish`).set('Authorization', `Bearer ${inst1Token}`);
      await request(app).post(`/api/courses/${aCourse.id}/enroll`).set('Authorization', `Bearer ${learner1Token}`);
    });

    test('comment creation and log', async () => {
      await request(app).post(`/api/courses/${aCourse.id}/comments`).set('Authorization', `Bearer ${learner1Token}`).send({ text: 'Nice course!' }).expect(201);
      const activities = await prisma.activityLog.findMany({ where: { courseId: aCourse.id, actionType: 'COMMENT_ADDED' }, include: { actor: true } });
      expect(activities.length).toBe(1);
      expect(activities[0].actorId).toBe(learner1.id);
      expect(activities[0].detail.text).toBe('Nice course!');
    });
  });

  describe('6. Dashboard & CSV', () => {
    let dCourse;
    beforeAll(async () => {
      const res = await request(app).post("/api/courses").set("Authorization", `Bearer ${inst1Token}`).send({ title: "Dash Course", category: "DC" }); dCourse = res.body.course;
      await request(app).post(`/api/courses/${dCourse.id}/lessons`).set('Authorization', `Bearer ${inst1Token}`).send({ title: 'L1', content: 'C' });
      await request(app).post(`/api/courses/${dCourse.id}/publish`).set('Authorization', `Bearer ${inst1Token}`);
      await request(app).post(`/api/courses/${dCourse.id}/enroll`).set('Authorization', `Bearer ${learner1Token}`);
    });

    test('dashboard aggregates', async () => {
      const res = await request(app).get('/api/dashboard/summary').set('Authorization', `Bearer ${inst1Token}`).expect(200);
      expect(res.body.data.summary.totalLearners).toBeGreaterThanOrEqual(1);
    });

    test('csv export', async () => {
      const res = await request(app).get(`/api/courses/${dCourse.id}/progress-export.csv`).set('Authorization', `Bearer ${inst1Token}`).expect(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.text).toContain('learner_email,course_title');
      expect(res.text).toContain(learner1.email);
    });

    test('csv unauthorized export', async () => {
      await request(app).get(`/api/courses/${dCourse.id}/progress-export.csv`).set('Authorization', `Bearer ${inst2Token}`).expect(403);
    });
  });
});
