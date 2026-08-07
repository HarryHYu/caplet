const { sanitizeAssessmentReport } = require('../services/assessmentReportParser');

describe('assessment report parser sanitizer', () => {
  const subjects = ['Economics', 'Mathematics Advanced'];

  it('keeps valid chosen-subject results and normalises their fields', () => {
    const result = sanitizeAssessmentReport({ entries: [{
      yearLevel: 'Year 11',
      term: '2',
      subject: 'economics',
      taskName: 'Policy essay',
      date: '2026-06-08',
      score: 18,
      maxMarks: 20,
      weighting: 25,
      reflection: 'model should not keep this',
    }] }, subjects);

    expect(result).toEqual([expect.objectContaining({
      yearLevel: 11,
      term: 'Term 2',
      subject: 'Economics',
      taskName: 'Policy essay',
      score: 18,
      maxMarks: 20,
      reflection: '',
    })]);
  });

  it('drops unselected subjects and impossible marks', () => {
    const result = sanitizeAssessmentReport({ entries: [
      { yearLevel: 11, term: 'Term 1', subject: 'Physics', taskName: 'Exam', score: 80, maxMarks: 100 },
      { yearLevel: 11, term: 'Term 1', subject: 'Economics', taskName: 'Exam', score: 101, maxMarks: 100 },
    ] }, subjects);

    expect(result).toEqual([]);
  });
});
