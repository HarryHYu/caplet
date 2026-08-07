# Database and persistence

Caplet uses PostgreSQL in production and SQLite for local development/tests when
`DATABASE_URL` is not configured. Sequelize models describe the application
objects; Umzug migrations in `backend/migrations/` define the database schema.
The server runs pending migrations before it starts serving traffic.

Run the local migration rehearsal with:

```bash
cd backend
npm run migrations:check
```

Existing migration filenames are part of the deployed Umzug history. Three
legacy numeric prefixes are duplicated (`002`, `016`, and `034`); they are
documented and preserved so an applied migration is not accidentally treated as
new. The migration naming check rejects any additional collision.

## Core relationships

```text
EditorWorkspace → Course → Module → Lesson
User → UserProgress, ReviewItem, StudyPlan, PracticeSession, MasteryState
User → Essay, SavedSlide, MarkedAttempt, AIInteraction
Classroom → ClassMembership, Assignment, ClassAnnouncement
Assignment → AssignmentSubmission
ClassAnnouncement → Comment → CommentModerationRecord
User → UserPrivacyPreference, ConsentRecord, GuardianConsentRequest
User → CdrConnection → CdrTransaction
```

## Important persistence boundaries

- Student progress is scoped by `userId` and is created as a learner enters a
  course or lesson.
- Classroom records are scoped by classroom membership and teacher/admin role;
  peer-facing responses intentionally omit learner email addresses.
- AI interactions are recorded only according to the active privacy settings;
  the AI learning-assistance path does not require guardian approval, while
  optional analytics and classroom-data sharing remain purpose-specific.
- Financial Twin/CDR data is minimized, consent-scoped, and deleted when its
  connection is revoked.
- Uploaded assets are tracked in `UploadedAsset` and stored through the S3
  presign/complete workflow rather than in the database body.

## Schema-change workflow

1. Add a new migration with a unique numeric prefix after the current set.
2. Implement both `up()` and `down()` using the query interface.
3. Update the relevant model and associations.
4. Run `npm run migrations:check` and the affected backend tests.
5. Review the migration against a disposable PostgreSQL database before a
   production release.

Never use `sequelize.sync({ alter: true })` to repair production schema drift.
If a deployed migration needs correction, add a new forward migration and
preserve the original history.
