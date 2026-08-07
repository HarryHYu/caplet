# Route map

Router: React Router configuration in `src/App.jsx`.

| URL | Component | Shell |
|---|---|---|
| `/dashboard` | `src/pages/Dashboard.jsx` | authenticated app shell |
| `/study-plan` | `src/pages/StudyPlan.jsx` | authenticated app shell |
| `/practice` | `src/pages/Practice.jsx` | authenticated app shell |
| `/mastery` | `src/pages/Mastery.jsx` | authenticated app shell |
| `/revision` | `src/pages/Revision.jsx` | authenticated app shell |
| `/library` | `src/pages/Library.jsx` | public/app shell |
| `/library/:subject` | `src/pages/LibrarySubject.jsx` | public/app shell |
| `/courses` | `src/pages/Courses.jsx` | public/app shell |
| `/settings/appearance` | `src/pages/SettingsAppearance.jsx` | authenticated settings shell |

The dashboard currently renders a greeting, large streak panel, large next-action card, optional exam/review cards, four stats, horizontal quick actions, resume-course content, classes, courses, tools, and a daily insight. The redesign target is only the streak and next-action area.
