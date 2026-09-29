import catalog from '../content/money/catalog.json';

const files = import.meta.glob('../content/money/*.md', { query: '?raw', import: 'default', eager: true });

export const moneyCourses = catalog.map((course) => ({
  ...course,
  lessons: course.lessons.map((lesson) => {
    const raw = files[`../content/money/${lesson.slug}.md`];
    if (!raw) throw new Error(`Missing money lesson: ${lesson.slug}`);
    // Keep original review metadata in the source, not in the reading surface.
    const content = raw.replace(/^---\n[\s\S]*?\n---\n/, '').replace(/^\s*# .+\n/, '').replace(/\n\[Organisation name\]\s*$/, '').trim();
    const answerMatch = content.match(/\n## Answers\n([\s\S]*?)(?=\n## |$)/);
    return {
      ...lesson,
      course: course.course,
      courseTitle: course.title,
      minutes: Number(raw.match(/^reading_time_minutes: (\d+)/m)?.[1]) || Math.ceil(lesson.word_count / 150),
      pendingChecks: (content.match(/TODO: confirm from official source/g) || []).length,
      body: answerMatch ? content.slice(0, answerMatch.index) : content,
      answers: answerMatch?.[1].trim() || '',
      afterAnswers: answerMatch ? content.slice(answerMatch.index + answerMatch[0].length) : '',
    };
  }),
}));

export const moneyLessons = moneyCourses.flatMap((course) => course.lessons);
