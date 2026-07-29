jest.mock('../models/Course', () => ({
  findOne: jest.fn(),
  findAndCountAll: jest.fn(),
  findAll: jest.fn(),
}));
jest.mock('../models/Module', () => ({}));
jest.mock('../models/Lesson', () => ({
  findByPk: jest.fn(),
}));
jest.mock('../models/UserProgress', () => ({}));

const express = require('express');
const request = require('supertest');
const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const coursesRouter = require('../routes/courses');

const app = express();
app.use(express.json());
app.use('/api/courses', coursesRouter);

describe('course publication boundary', () => {
  beforeEach(() => jest.clearAllMocks());

  test('does not expose an unpublished course through a guessed direct URL', async () => {
    Course.findOne.mockResolvedValue({ id: 'draft-course', isPublished: false });

    const response = await request(app).get('/api/courses/draft-course');

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Course not found');
  });

  test('does not expose a lesson belonging to an unpublished course', async () => {
    Lesson.findByPk.mockResolvedValue({
      id: 'draft-lesson',
      module: {
        courseId: 'draft-course',
        course: { id: 'draft-course', isPublished: false },
      },
    });

    const response = await request(app).get('/api/courses/draft-course/lessons/draft-lesson');

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Lesson not found');
  });
});
