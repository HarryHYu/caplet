# Key page dependency trees

## `/dashboard`
Entry: `src/pages/Dashboard.jsx`

- `src/contexts/AuthContext.jsx`
- `src/contexts/CoursesContext.jsx`
- `src/lib/useReveal.js`
- `src/services/api.js`
- `src/components/CapletLoader.jsx`
- `src/components/ClassIcon.jsx`
- `src/components/learning/LearningNextAction.jsx`
  - `src/components/learning/learningNextActionUtils.js`
  - `src/services/api.js`
- shell: `src/App.jsx`
  - `src/components/Sidebar.jsx`
  - `src/components/Navbar.jsx`
  - `src/components/TabletDashboardNavbar.jsx`
  - `src/components/ProductModeSwitch.jsx`
- tokens: `src/index.css`, `tailwind.config.js`

## `/settings/appearance`
Entry: `src/pages/SettingsAppearance.jsx`

- `src/contexts/ThemeContext.jsx`
- `src/contexts/LayoutContext.jsx`
- shell dependencies listed above

## `/library`
Entry: `src/pages/Library.jsx`

- `src/components/learning/LearningNextAction.jsx`
- `src/components/library/SubjectIcon.jsx`
- shared shell and theme dependencies listed above
