jest.mock('../services/studyMomentumService', () => ({
  getStudyMomentum: jest.fn(),
  parseTimezoneOffset: jest.requireActual('../services/studyMomentumService').parseTimezoneOffset,
}));
jest.mock('../middleware/auth', () => ({
  requireAuth: (req, _res, next) => {
    req.user = { id: 'student-1' };
    next();
  },
}));

const express = require('express');
const request = require('supertest');
const { getStudyMomentum } = require('../services/studyMomentumService');
const router = require('../routes/streaks');

function app() {
  const instance = express();
  instance.use('/api/streaks', router);
  return instance;
}

describe('GET /api/streaks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getStudyMomentum.mockResolvedValue({ currentStreak: 4, todayComplete: true });
  });

  test('returns the authenticated learner momentum', async () => {
    const response = await request(app()).get('/api/streaks?timezoneOffset=-480');

    expect(response.status).toBe(200);
    expect(response.body.momentum.currentStreak).toBe(4);
    expect(getStudyMomentum).toHaveBeenCalledWith('student-1', { timezoneOffset: -480 });
  });

  test('rejects unsafe timezone offsets', async () => {
    const response = await request(app()).get('/api/streaks?timezoneOffset=900');

    expect(response.status).toBe(400);
    expect(getStudyMomentum).not.toHaveBeenCalled();
  });
});
