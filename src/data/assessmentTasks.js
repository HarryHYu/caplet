const yearlyExam = (id, date, subject, time, duration, venue) => ({
  id,
  date,
  dateLabel: new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short' }).format(new Date(`${date}T12:00:00`)),
  subject,
  group: 'Yearly exams',
  type: 'Yearly examination',
  status: 'Scheduled',
  time,
  duration,
  venue,
  detail: `${time} · ${duration} · ${venue}`,
  source: 'Official 2026 yearly examinations timetable',
});

export const OFFICIAL_ASSESSMENT_TASKS = [
  {
    id: 'music-1-music-2', date: '2026-08-10', dateLabel: '10–13 Aug', subject: 'Music 1 & Music 2',
    group: 'Term 3', type: 'In-class task window', status: 'Scheduled', detail: 'Scheduled across four school days.', source: 'Term 3 Gantt',
  },
  {
    id: 'drama', date: '2026-08-17', dateLabel: '17–20 Aug', subject: 'Drama',
    group: 'Term 3', type: 'In-class task window', status: 'Scheduled', detail: 'Scheduled across four school days.', source: 'Term 3 Gantt',
  },
  {
    id: 'industrial-technology', date: '2026-08-20', dateLabel: '20 Aug', subject: 'Industrial Technology',
    group: 'Term 3', type: 'Assessment block', status: 'Time TBC', detail: 'The grid marks this as a task in the assessment block; the exact time is to be confirmed.', source: 'Term 3 Gantt',
  },
  {
    id: 'design-technology', date: '2026-08-21', dateLabel: '21 Aug', subject: 'Design & Technology',
    group: 'Term 3', type: 'Assessment block', status: 'Time TBC', detail: 'The grid marks this as a task in the assessment block; the exact time is to be confirmed.', source: 'Term 3 Gantt',
  },
  {
    id: 'photography-video-digital-imaging', date: '2026-08-21', dateLabel: '21 Aug', subject: 'Photography, Video & Digital Imaging',
    group: 'Term 3', type: 'Assessment block', status: 'Time TBC', detail: 'The grid marks this as a task in the assessment block; the exact time is to be confirmed.', source: 'Term 3 Gantt',
  },
  {
    id: 'english-studies', date: '2026-09-16', dateLabel: '16 Sep', subject: 'English Studies',
    group: 'Term 3', type: 'Assessment block', status: 'Time TBC', detail: 'The grid marks this as a task in the assessment block; the exact time is to be confirmed.', source: 'Term 3 Gantt',
  },
  yearlyExam('english-advanced-yearly', '2026-08-31', 'English Advanced', '8.55am–9.40am', '40 minutes + 5 minutes reading time', 'Great Hall'),
  yearlyExam('english-standard-yearly', '2026-08-31', 'English Standard', '8.55am–9.40am', '40 minutes + 5 minutes reading time', 'Great Hall'),
  yearlyExam('english-eald-yearly', '2026-08-31', 'English (EAL/D)', '8.55am–9.40am', '40 minutes + 5 minutes reading time', 'Great Hall'),
  yearlyExam('english-extension-yearly', '2026-09-01', 'English Extension 1', '8.55am–10.00am', '1 hour + 5 minutes reading time', 'KCC Hall'),
  yearlyExam('investigating-science-yearly', '2026-09-01', 'Investigating Science', '8.55am–11.15am', '2 hours 15 minutes + 5 minutes reading time', 'KCC102, KCC103'),
  yearlyExam('industrial-technology-metal-yearly', '2026-09-01', 'Industrial Technology', '12.55pm–2.30pm', '1 hour 30 minutes + 5 minutes reading time', 'KCC Hall'),
  yearlyExam('industrial-technology-multimedia-yearly', '2026-09-01', 'Industrial Technology', '12.55pm–2.30pm', '1 hour 30 minutes + 5 minutes reading time', 'KCC Hall'),
  yearlyExam('industrial-technology-timber-yearly', '2026-09-01', 'Industrial Technology', '12.55pm–2.30pm', '1 hour 30 minutes + 5 minutes reading time', 'KCC Hall'),
  yearlyExam('music-2-yearly', '2026-09-01', 'Music 2', '12.55pm–2.30pm', '1 hour 30 minutes + 5 minutes reading time', 'JAPAC'),
  yearlyExam('business-studies-yearly', '2026-09-02', 'Business Studies', '8.55am–11.15am', '2 hours 15 minutes + 5 minutes reading time', 'Great Hall'),
  yearlyExam('business-services-yearly', '2026-09-02', 'Business Services VET', '8.55am–10.05am', '1 hour 5 minutes + 5 minutes reading time', 'Great Hall'),
  yearlyExam('physics-yearly', '2026-09-03', 'Physics', '8.55am–11.15am', '2 hours 15 minutes + 5 minutes reading time', 'KCC Hall, KCC102'),
  yearlyExam('earth-environmental-science-yearly', '2026-09-03', 'Earth and Environmental Science', '8.55am–11.15am', '2 hours 15 minutes + 5 minutes reading time', 'KCC104'),
  yearlyExam('music-1-yearly', '2026-09-03', 'Music 1', '8.55am–10.00am', '1 hour + 5 minutes reading time', 'JAPAC'),
  yearlyExam('modern-history-yearly', '2026-09-03', 'Modern History', '12.55pm–3.15pm', '2 hours 15 minutes + 5 minutes reading time', 'KCC Hall, KCC102'),
  yearlyExam('legal-studies-yearly', '2026-09-04', 'Legal Studies', '8.55am–11.15am', '2 hours 15 minutes + 5 minutes reading time', 'KCC Hall'),
  yearlyExam('visual-arts-yearly', '2026-09-04', 'Visual Arts', '8.55am–10.30am', '1 hour 30 minutes + 5 minutes reading time', 'KCC102'),
  yearlyExam('design-technology-yearly', '2026-09-04', 'Design and Technology', '8.55am–10.30am', '1 hour 30 minutes + 5 minutes reading time', 'KCC104'),
  yearlyExam('ancient-history-yearly', '2026-09-04', 'Ancient History', '12.55pm–3.15pm', '2 hours 15 minutes + 5 minutes reading time', 'KCC Hall'),
  yearlyExam('chinese-context-yearly', '2026-09-04', 'Chinese in Context', '12.50pm–3.30pm', '2 hours 30 minutes + 10 minutes reading time', 'KCC301'),
  yearlyExam('french-continuers-yearly', '2026-09-04', 'French Continuers', '12.50pm–3.50pm', '2 hours 50 minutes + 10 minutes reading time', 'KCC102'),
  yearlyExam('german-continuers-yearly', '2026-09-04', 'German Continuers', '12.50pm–3.50pm', '2 hours 50 minutes + 10 minutes reading time', 'DLH'),
  yearlyExam('japanese-continuers-yearly', '2026-09-04', 'Japanese Continuers', '12.50pm–3.50pm', '2 hours 50 minutes + 10 minutes reading time', 'KCC104'),
  yearlyExam('math-advanced-yearly', '2026-09-07', 'Mathematics Advanced', '8.50am–11.15am', '2 hours 15 minutes + 10 minutes reading time', 'Great Hall'),
  yearlyExam('math-standard-yearly', '2026-09-07', 'Mathematics Standard', '8.50am–11.00am', '2 hours + 10 minutes reading time', 'Great Hall'),
  yearlyExam('chemistry-yearly', '2026-09-08', 'Chemistry', '8.55am–11.15am', '2 hours 15 minutes + 5 minutes reading time', 'Great Hall'),
  yearlyExam('geography-yearly', '2026-09-08', 'Geography', '12.55pm–2.30pm', '1 hour 30 minutes + 5 minutes reading time', 'Great Hall'),
  yearlyExam('economics-yearly', '2026-09-09', 'Economics', '8.50am–11.15am', '2 hours 15 minutes + 5 minutes reading time', 'KCC Hall, KCC102, KCC103, KCC104'),
  yearlyExam('agriculture-yearly', '2026-09-09', 'Agriculture', '12.55pm–3.15pm', '2 hours 15 minutes + 5 minutes reading time', 'KCC Hall'),
  yearlyExam('software-engineering-yearly', '2026-09-09', 'Software Engineering', '12.55pm–3.00pm', '2 hours + 5 minutes reading time', 'KCC102'),
  yearlyExam('math-extension-1-yearly', '2026-09-10', 'Mathematics Extension 1', '8.50am–11.00am', '2 hours + 10 minutes reading time', 'KCC Hall, KCC103, KCC104'),
  yearlyExam('drama-yearly', '2026-09-10', 'Drama', '8.55am–10.30am', '1 hour 30 minutes + 5 minutes reading time', 'KCC102'),
  yearlyExam('health-movement-science-yearly', '2026-09-10', 'Health and Movement Science', '12.55pm–3.00pm', '2 hours + 5 minutes reading time', 'KCC Hall'),
  yearlyExam('photography-yearly', '2026-09-10', 'Photography, Video and Digital Imaging', '12.55pm–1.45pm', '45 minutes + 5 minutes reading time', 'KCC104, KCC103'),
  yearlyExam('enterprise-computing-yearly', '2026-09-11', 'Enterprise Computing', '8.55am–11.00am', '2 hours + 5 minutes reading time', 'KCC102'),
  yearlyExam('sport-lifestyle-recreation-yearly', '2026-09-11', 'Sport, Lifestyle and Recreation Studies', '8.55am–9.40am', '40 minutes + 5 minutes reading time', 'KCC103, KCC104'),
  yearlyExam('studies-religion-1-yearly', '2026-09-11', 'Studies of Religion I', '8.55am–10.30am', '1 hour 30 minutes + 5 minutes reading time', 'KCC Hall'),
  yearlyExam('studies-religion-2-yearly', '2026-09-11', 'Studies of Religion II', '8.55am–11.15am', '2 hours 15 minutes + 5 minutes reading time', 'KCC Hall'),
  yearlyExam('biology-yearly', '2026-09-11', 'Biology', '12.55pm–3.15pm', '2 hours 15 minutes + 5 minutes reading time', 'KCC Hall'),
  yearlyExam('engineering-studies-yearly', '2026-09-11', 'Engineering Studies', '12.55pm–3.00pm', '2 hours + 5 minutes reading time', 'KCC102, KCC103'),
];

export const formatAssessmentDate = (date, options = {}) => new Intl.DateTimeFormat('en-AU', {
  day: 'numeric', month: 'short', ...(options.weekday === false ? {} : { weekday: 'short' }),
}).format(new Date(`${date}T12:00:00`));

export const calendarDaysUntil = (date, now = new Date()) => {
  const [year, month, day] = date.split('-').map(Number);
  const targetUtc = Date.UTC(year, month - 1, day);
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.ceil((targetUtc - todayUtc) / 86400000);
};

export const countdownLabel = (days) => {
  if (days < 0) return `${Math.abs(days)} ${Math.abs(days) === 1 ? 'day' : 'days'} ago`;
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `${days} days`;
};

export const isExamTask = (task) => task.group === 'Yearly exams' || /exam|yearly/i.test(task.type || '');
