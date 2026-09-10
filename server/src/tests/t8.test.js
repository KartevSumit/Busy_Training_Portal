const request = require('supertest');
const app = require('../index');
const prisma = require('../db/prisma');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const createToken = (id, email, role) => jwt.sign({ id, email, role }, process.env.JWT_SECRET || 'supersecret123');

describe('T8 Inactivity Alerts', () => {
  jest.setTimeout(30000);
  let instA, instB, learner, tokenA, tokenB, tokenLearner;
  let courseA, courseB, lessonA1, lessonA2, lessonB1;

  beforeAll(async () => {
    const pwd = await bcrypt.hash('password123', 10);
    const ts = Date.now();
    
    instA = await prisma.user.create({ data: { email: `ia${ts}@t.com`, password: pwd, role: 'INSTRUCTOR' } });
    instB = await prisma.user.create({ data: { email: `ib${ts}@t.com`, password: pwd, role: 'INSTRUCTOR' } });
    learner = await prisma.user.create({ data: { email: `l${ts}@t.com`, password: pwd, role: 'LEARNER' } });

    tokenA = createToken(instA.id, instA.email, instA.role);
    tokenB = createToken(instB.id, instB.email, instB.role);
    tokenLearner = createToken(learner.id, learner.email, learner.role);

    courseA = await prisma.course.create({ data: { title: 'CA', category: 'cat', instructorId: instA.id, status: 'PUBLISHED' } });
    courseB = await prisma.course.create({ data: { title: 'CB', category: 'cat', instructorId: instB.id, status: 'PUBLISHED' } });

    lessonA1 = await prisma.lesson.create({ data: { courseId: courseA.id, title: 'L1', content: 'C', position: 1 } });
    lessonA2 = await prisma.lesson.create({ data: { courseId: courseA.id, title: 'L2', content: 'C', position: 2 } });
    lessonB1 = await prisma.lesson.create({ data: { courseId: courseB.id, title: 'L1', content: 'C', position: 1 } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.alertDismissal.deleteMany({ where: { learnerId: learner.id } });
    await prisma.lessonProgress.deleteMany({ where: { enrollment: { learnerId: learner.id } } });
    await prisma.enrollment.deleteMany({ where: { learnerId: learner.id } });
  });

  const getAlerts = (token) => request(app).get('/api/alerts').set('Authorization', `Bearer ${token}`);
  const dismissAlert = (token, courseId, learnerId) => request(app).post(`/api/courses/${courseId}/alerts/${learnerId}/dismiss`).set('Authorization', `Bearer ${token}`);

  const setTimestamp = async (enrollmentId, daysAgo) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { statusChangedAt: d }
    });
  };

  test('Test 6: Basic inactivity boundaries', async () => {
    const e1 = await prisma.enrollment.create({ data: { learnerId: learner.id, courseId: courseA.id, status: 'IN_PROGRESS' } });
    await setTimestamp(e1.id, 10);
    
    const e2 = await prisma.enrollment.create({ data: { learnerId: learner.id, courseId: courseB.id, status: 'IN_PROGRESS' } });
    await setTimestamp(e2.id, 15);

    let res = await getAlerts(tokenA);
    expect(res.body.data).toHaveLength(0);

    res = await getAlerts(tokenB);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].courseId).toBe(courseB.id);

    await prisma.enrollment.update({ where: { id: e2.id }, data: { status: 'NOT_STARTED' } });
    res = await getAlerts(tokenB);
    expect(res.body.data).toHaveLength(0);

    await prisma.enrollment.update({ where: { id: e2.id }, data: { status: 'COMPLETED' } });
    res = await getAlerts(tokenB);
    expect(res.body.data).toHaveLength(0);
  });

  test('Test 1 & 4: Dismissal suppresses the same episode, duplicate dismissal is idempotent', async () => {
    const e = await prisma.enrollment.create({ data: { learnerId: learner.id, courseId: courseA.id, status: 'IN_PROGRESS' } });
    await setTimestamp(e.id, 15);

    let res = await getAlerts(tokenA);
    expect(res.body.data).toHaveLength(1);

    await dismissAlert(tokenA, courseA.id, learner.id).expect(200);
    
    res = await getAlerts(tokenA);
    expect(res.body.data).toHaveLength(0);

    await dismissAlert(tokenA, courseA.id, learner.id).expect(200);
    const dismissals = await prisma.alertDismissal.findMany();
    expect(dismissals).toHaveLength(1);
  });

  test('Test 2, 3, & T4 Semantics: New learner progress creates a new episode', async () => {
    const e = await prisma.enrollment.create({ data: { learnerId: learner.id, courseId: courseA.id, status: 'IN_PROGRESS' } });
    
    await setTimestamp(e.id, 15);
    await dismissAlert(tokenA, courseA.id, learner.id).expect(200);

    const oldTimestamp = (await prisma.enrollment.findUnique({ where: { id: e.id } })).statusChangedAt;
    
    const completeRes = await request(app)
      .post(`/api/lessons/${lessonA1.id}/complete`)
      .set('Authorization', `Bearer ${tokenLearner}`);
    expect(completeRes.status).toBe(200);

    const afterL1 = await prisma.enrollment.findUnique({ where: { id: e.id } });
    expect(afterL1.statusChangedAt.getTime()).toBeGreaterThan(oldTimestamp.getTime());

    await setTimestamp(e.id, 10);
    let res = await getAlerts(tokenA);
    expect(res.body.data).toHaveLength(0);

    await setTimestamp(e.id, 15);
    res = await getAlerts(tokenA);
    expect(res.body.data).toHaveLength(1);

    const stampBeforeDup = (await prisma.enrollment.findUnique({ where: { id: e.id } })).statusChangedAt;
    await request(app)
      .post(`/api/lessons/${lessonA1.id}/complete`)
      .set('Authorization', `Bearer ${tokenLearner}`)
      .expect(200);
    
    const stampAfterDup = (await prisma.enrollment.findUnique({ where: { id: e.id } })).statusChangedAt;
    expect(stampAfterDup.getTime()).toBe(stampBeforeDup.getTime());
  });

  test('Test 5: Instructor ownership isolation', async () => {
    const e1 = await prisma.enrollment.create({ data: { learnerId: learner.id, courseId: courseA.id, status: 'IN_PROGRESS' } });
    const e2 = await prisma.enrollment.create({ data: { learnerId: learner.id, courseId: courseB.id, status: 'IN_PROGRESS' } });
    await setTimestamp(e1.id, 15);
    await setTimestamp(e2.id, 15);

    const resA = await getAlerts(tokenA);
    expect(resA.body.data).toHaveLength(1);
    expect(resA.body.data[0].courseId).toBe(courseA.id);

    const resB = await getAlerts(tokenB);
    expect(resB.body.data).toHaveLength(1);
    expect(resB.body.data[0].courseId).toBe(courseB.id);

    await dismissAlert(tokenA, courseB.id, learner.id).expect(403);
  });

  test('Test 7: Learner cannot access alert endpoints', async () => {
    await getAlerts(tokenLearner).expect(403);
    await dismissAlert(tokenLearner, courseA.id, learner.id).expect(403);
  });
});
