# Extractable components

## ProductModeSwitch
- Source: `src/components/ProductModeSwitch.jsx`
- Category: basic
- Description: persistent Study/Money segmented navigation control.
- Extractable props: `collapsed` (boolean)
- Hardcoded: Study/Money labels and Heroicons.

## Sidebar
- Source: `src/components/Sidebar.jsx`
- Category: layout
- Description: desktop Caplet application rail.
- Extractable props: `collapsed` (boolean), `activeItem` (string)
- Hardcoded: logo, route labels, tokenized classes.

## LearningNextAction
- Source: `src/components/learning/LearningNextAction.jsx`
- Category: basic
- Description: prominent learning recommendation card.
- Extractable props: `eyebrow`, `title`, `detail`, `href`.
- Hardcoded: sparkle and arrow icons, blue token styling.

## DashboardTodayCard
- Source: proposed in `src/pages/Dashboard.jsx`
- Category: basic
- Description: compact, dismissible streak or next-action item for the dashboard.
- Extractable props: `kind`, `title`, `detail`, `href`, `hidden`.
- Hardcoded: compact desktop layout and tokenized styling.
