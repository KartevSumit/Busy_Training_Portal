const request = require('supertest');
const app = require('../index');
const prisma = require('../db/prisma');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
const generateToken = (payload) => jwt.sign(payload, JWT_SECRET);

describe('Stretch Features', () => {
  let admin, instructor1, instructor2, learner1, learner2;
  let tokenI1, tokenI2, tokenL1, tokenL2;
  let course1, lesson1;

  
  beforeAll(async () => {
    const r = Math.floor(Math.random() * 1000000);
    instructor1 = await prisma.user.create({ data: { email: 'i1_'+r+'@t.com', password: 'p', role: 'INSTRUCTOR' } });
    instructor2 = await prisma.user.create({ data: { email: 'i2_'+r+'@t.com', password: 'p', role: 'INSTRUCTOR' } });
    learner1 = await prisma.user.create({ data: { email: 'l1_'+r+'@t.com', password: 'p', role: 'LEARNER' } });
    learner2 = await prisma.user.create({ data: { email: 'l2_'+r+'@t.com', password: 'p', role: 'LEARNER' } });


    tokenI1 = generateToken({ id: instructor1.id, role: instructor1.role });
    tokenI2 = generateToken({ id: instructor2.id, role: instructor2.role });
    tokenL1 = generateToken({ id: learner1.id, role: learner1.role });
    tokenL2 = generateToken({ id: learner2.id, role: learner2.role });

    course1 = await prisma.course.create({
      data: {
        title: 'Course 1',
        category: 'Test',
        status: 'PUBLISHED',
        instructorId: instructor1.id
      }
    });

    lesson1 = await prisma.lesson.create({
      data: {
        courseId: course1.id,
        title: 'L1',
        content: 'C1',
        position: 0
      }
    });

    await prisma.enrollment.create({
      data: {
        learnerId: learner1.id,
        courseId: course1.id,
        status: 'IN_PROGRESS'
      }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Part 1 - Quizzes', () => {
    let quizId, questionId;

    it('instructor can create quiz for own course', async () => {
      const res = await request(app)
        .post(`/api/courses/${course1.id}/quizzes`)
        .set('Authorization', `Bearer ${tokenI1}`)
        .send({ title: 'Quiz 1' });
      expect(res.status).toBe(201);
      quizId = res.body.id;
    });

    it('instructor cannot create quiz for another instructor course', async () => {
      const res = await request(app)
        .post(`/api/courses/${course1.id}/quizzes`)
        .set('Authorization', `Bearer ${tokenI2}`)
        .send({ title: 'Quiz 2' });
      expect(res.status).toBe(403);
    });

    it('learner cannot create/edit/delete quizzes', async () => {
      let res = await request(app)
        .post(`/api/courses/${course1.id}/quizzes`)
        .set('Authorization', `Bearer ${tokenL1}`)
        .send({ title: 'Quiz 2' });
      expect(res.status).toBe(403);

      res = await request(app)
        .patch(`/api/quizzes/${quizId}`)
        .set('Authorization', `Bearer ${tokenL1}`)
        .send({ title: 'Quiz Mod' });
      expect(res.status).toBe(403);

      res = await request(app)
        .delete(`/api/quizzes/${quizId}`)
        .set('Authorization', `Bearer ${tokenL1}`);
      expect(res.status).toBe(403);
    });

    it('instructor can create question', async () => {
      const res = await request(app)
        .post(`/api/quizzes/${quizId}/questions`)
        .set('Authorization', `Bearer ${tokenI1}`)
        .send({
          question: 'What is 2+2?',
          optionA: '3',
          optionB: '4',
          optionC: '5',
          optionD: '6',
          correctOption: 'B'
        });
      expect(res.status).toBe(201);
      questionId = res.body.id;
    });

    it('invalid correctOption rejected', async () => {
      const res = await request(app)
        .post(`/api/quizzes/${quizId}/questions`)
        .set('Authorization', `Bearer ${tokenI1}`)
        .send({
          question: 'What is 2+2?',
          optionA: '3',
          optionB: '4',
          optionC: '5',
          optionD: '6',
          correctOption: 'E'
        });
      expect(res.status).toBe(400);
    });

    it('enrolled learner can retrieve published quiz and correctOption is NOT returned', async () => {
      const res = await request(app)
        .get(`/api/quizzes/${quizId}`)
        .set('Authorization', `Bearer ${tokenL1}`);
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Quiz 1');
      expect(res.body.questions).toHaveLength(1);
      expect(res.body.questions[0].correctOption).toBeUndefined();
    });

    it('learner cannot access draft quiz', async () => {
      await prisma.course.update({ where: { id: course1.id }, data: { status: 'DRAFT' } });
      const res = await request(app)
        .get(`/api/quizzes/${quizId}`)
        .set('Authorization', `Bearer ${tokenL1}`);
      expect(res.status).toBe(403);
      await prisma.course.update({ where: { id: course1.id }, data: { status: 'PUBLISHED' } });
    });

    it('learner cannot submit for another course quiz (not enrolled)', async () => {
      const res = await request(app)
        .post(`/api/quizzes/${quizId}/submit`)
        .set('Authorization', `Bearer ${tokenL2}`)
        .send({ answers: { [questionId]: 'B' } });
      expect(res.status).toBe(403);
    });

    it('quiz submission computes correct score', async () => {
      const res = await request(app)
        .post(`/api/quizzes/${quizId}/submit`)
        .set('Authorization', `Bearer ${tokenL1}`)
        .send({ answers: { [questionId]: 'B' } });
      expect(res.status).toBe(200);
      expect(res.body.score).toBe(1);
      expect(res.body.total).toBe(1);
    });
  });

  describe('Part 2 - Resources', () => {
    it('1. URL only succeeds', async () => {
      const res = await request(app)
        .patch(`/api/lessons/${lesson1.id}`)
        .set('Authorization', `Bearer ${tokenI1}`)
        .send({ resourceUrl: 'https://example.com/url-only' });
      expect(res.status).toBe(200);
      expect(res.body.lesson.resourceUrl).toBe('https://example.com/url-only');
      expect(res.body.lesson.resourceName).toBeNull();
    });

    it('2. URL + name succeeds', async () => {
      const res = await request(app)
        .patch(`/api/lessons/${lesson1.id}`)
        .set('Authorization', `Bearer ${tokenI1}`)
        .send({ resourceUrl: 'https://example.com/file.pdf', resourceName: 'File Name' });
      expect(res.status).toBe(200);
      expect(res.body.lesson.resourceUrl).toBe('https://example.com/file.pdf');
      expect(res.body.lesson.resourceName).toBe('File Name');
    });

    it('3. name without URL fails', async () => {
      const res = await request(app)
        .patch(`/api/lessons/${lesson1.id}`)
        .set('Authorization', `Bearer ${tokenI1}`)
        .send({ resourceUrl: '', resourceName: 'File Name' });
      expect(res.status).toBe(400);
    });

    it('4. neither succeeds', async () => {
      
      const res = await request(app)
        .post(`/api/courses/${course1.id}/lessons`)
        .set('Authorization', `Bearer ${tokenI1}`)
        .send({ title: 'New Lesson', content: 'Content' });
      expect(res.status).toBe(201);
      expect(res.body.lesson.resourceUrl).toBeNull();
      expect(res.body.lesson.resourceName).toBeNull();
    });

    it('5. clearing a resource removes both values', async () => {
      const res = await request(app)
        .patch(`/api/lessons/${lesson1.id}`)
        .set('Authorization', `Bearer ${tokenI1}`)
        .send({ resourceUrl: '', resourceName: '' });
      expect(res.status).toBe(200);
      expect(res.body.lesson.resourceUrl).toBeNull();
      expect(res.body.lesson.resourceName).toBeNull();
    });

    it('6. learner response behaves correctly for URL-only and URL+name resources', async () => {
      
      await request(app)
        .patch(`/api/lessons/${lesson1.id}`)
        .set('Authorization', `Bearer ${tokenI1}`)
        .send({ resourceUrl: 'https://example.com/learner', resourceName: 'Learner Resource' });
        
      const res = await request(app)
        .get(`/api/courses/${course1.id}/lessons`)
        .set('Authorization', `Bearer ${tokenL1}`);
      expect(res.status).toBe(200);
      
      const targetLesson = res.body.lessons.find(l => l.id === lesson1.id);
      expect(targetLesson.resourceUrl).toBe('https://example.com/learner');
      expect(targetLesson.resourceName).toBe('Learner Resource');
    });

    it('unauthorized instructor cannot modify another instructor lesson', async () => {
      const res = await request(app)
        .patch(`/api/lessons/${lesson1.id}`)
        .set('Authorization', `Bearer ${tokenI2}`)
        .send({ resourceUrl: 'https://example.com/file2.pdf' });
      expect(res.status).toBe(403);
    });
  });

  describe('Part 3 - Discussions', () => {
    it('authorized learner can comment on lesson', async () => {
      const res = await request(app)
        .post(`/api/courses/${course1.id}/comments`)
        .set('Authorization', `Bearer ${tokenL1}`)
        .send({ text: 'Great lesson!', lessonId: lesson1.id });
      expect(res.status).toBe(201);
      expect(res.body.comment.text).toBe('Great lesson!');
    });

    it('learner cannot comment on inaccessible/draft course', async () => {
      const res = await request(app)
        .post(`/api/courses/${course1.id}/comments`)
        .set('Authorization', `Bearer ${tokenL2}`)
        .send({ text: 'Nice!', lessonId: lesson1.id });
      expect(res.status).toBe(403);
    });

    it('can retrieve lesson comments', async () => {
      const res = await request(app)
        .get(`/api/lessons/${lesson1.id}/comments`)
        .set('Authorization', `Bearer ${tokenL1}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].text).toBe('Great lesson!');
    });
  });
});
