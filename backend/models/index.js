const { sequelize } = require('../config/database');
const User = require('./User');
const Course = require('./Course');
const Module = require('./Module');
const Lesson = require('./Lesson');
const UserProgress = require('./UserProgress');
const Survey = require('./Survey');
const Classroom = require('./Classroom');
const ClassMembership = require('./ClassMembership');
const Assignment = require('./Assignment');
const AssignmentSubmission = require('./AssignmentSubmission');
const ClassAnnouncement = require('./ClassAnnouncement');
const Comment = require('./Comment');
const CommentModerationRecord = require('./CommentModerationRecord');
const CommentModerationAction = require('./CommentModerationAction');
const ChatMessage = require('./ChatMessage');
const EditorWorkspace = require('./EditorWorkspace');
const SavedSlide = require('./SavedSlide');
const UserFinancialProfile = require('./UserFinancialProfile');
const ReviewItem = require('./ReviewItem');
const Essay = require('./Essay');
const LiveSession = require('./LiveSession');
const LiveParticipant = require('./LiveParticipant');
const LiveResponse = require('./LiveResponse');
const CdrConnection = require('./CdrConnection');
const CdrTransaction = require('./CdrTransaction');
const MarkedAttempt = require('./MarkedAttempt');
const StudyPlan = require('./StudyPlan');
const EconomicsExamSession = require('./EconomicsExamSession');
const CurriculumOutcome = require('./CurriculumOutcome');
const ContentOutcome = require('./ContentOutcome');
const Question = require('./Question');
const QuestionOutcome = require('./QuestionOutcome');
const PracticeSession = require('./PracticeSession');
const LearningEvidence = require('./LearningEvidence');
const MasteryState = require('./MasteryState');
const ProductEvent = require('./ProductEvent');
const TeacherProfile = require('./TeacherProfile');
const TeacherVerificationAudit = require('./TeacherVerificationAudit');
const OutcomeAssignmentConfig = require('./OutcomeAssignmentConfig');
const ContentRevision = require('./ContentRevision');
const AIInteraction = require('./AIInteraction');
const ConsentRecord = require('./ConsentRecord');
const UserPrivacyPreference = require('./UserPrivacyPreference');
const GuardianConsentRequest = require('./GuardianConsentRequest');
const FeatureFlag = require('./FeatureFlag');
const FeatureFlagAudit = require('./FeatureFlagAudit');
const BackupVerification = require('./BackupVerification');
const UploadedAsset = require('./UploadedAsset');
const OperationalAlert = require('./OperationalAlert');
const EconomicSource = require('./EconomicSource');
const EconomicSeries = require('./EconomicSeries');
const EconomicObservation = require('./EconomicObservation');
const EconomicIngestionRun = require('./EconomicIngestionRun');
const CurriculumEdition = require('./CurriculumEdition');

// Define associations: Course → Module → Lesson
EditorWorkspace.hasMany(Course, {
  foreignKey: 'workspaceId',
  as: 'courses',
  onDelete: 'CASCADE'
});
Course.belongsTo(EditorWorkspace, {
  foreignKey: 'workspaceId',
  as: 'workspace'
});

Course.hasMany(Module, {
  foreignKey: 'courseId',
  as: 'modules',
  onDelete: 'CASCADE'
});
Module.belongsTo(Course, {
  foreignKey: 'courseId',
  as: 'course'
});

Module.hasMany(Lesson, {
  foreignKey: 'moduleId',
  as: 'lessons',
  onDelete: 'CASCADE'
});
Lesson.belongsTo(Module, {
  foreignKey: 'moduleId',
  as: 'module'
});
Lesson.belongsTo(Lesson, { foreignKey: 'previousVersionId', as: 'previousVersion' });
Lesson.hasOne(Lesson, { foreignKey: 'previousVersionId', as: 'nextVersion' });

User.hasMany(UserProgress, {
  foreignKey: 'userId',
  as: 'progress',
  onDelete: 'CASCADE'
});
UserProgress.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});


Course.hasMany(UserProgress, {
  foreignKey: 'courseId',
  as: 'progress',
  onDelete: 'CASCADE'
});
UserProgress.belongsTo(Course, {
  foreignKey: 'courseId',
  as: 'course'
});

Lesson.hasMany(UserProgress, {
  foreignKey: 'lessonId',
  as: 'progress',
  onDelete: 'CASCADE'
});
UserProgress.belongsTo(Lesson, {
  foreignKey: 'lessonId',
  as: 'lesson'
});

// Classroom relationships
User.hasMany(Classroom, {
  foreignKey: 'createdBy',
  as: 'createdClasses',
  onDelete: 'CASCADE',
});
Classroom.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'creator',
});

Classroom.hasMany(ClassMembership, {
  foreignKey: 'classroomId',
  as: 'memberships',
  onDelete: 'CASCADE',
});
ClassMembership.belongsTo(Classroom, {
  foreignKey: 'classroomId',
  as: 'classroom',
});

User.hasMany(ClassMembership, {
  foreignKey: 'userId',
  as: 'classMemberships',
  onDelete: 'CASCADE',
});
ClassMembership.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

Classroom.hasMany(Assignment, {
  foreignKey: 'classroomId',
  as: 'assignments',
  onDelete: 'CASCADE',
});
Assignment.belongsTo(Classroom, {
  foreignKey: 'classroomId',
  as: 'classroom',
});

Assignment.belongsTo(Course, {
  foreignKey: 'courseId',
  as: 'course',
});
Assignment.belongsTo(Lesson, {
  foreignKey: 'lessonId',
  as: 'lesson',
});

Assignment.hasMany(AssignmentSubmission, {
  foreignKey: 'assignmentId',
  as: 'submissions',
  onDelete: 'CASCADE',
});
AssignmentSubmission.belongsTo(Assignment, {
  foreignKey: 'assignmentId',
  as: 'assignment',
});

User.hasMany(AssignmentSubmission, {
  foreignKey: 'studentId',
  as: 'assignmentSubmissions',
  onDelete: 'CASCADE',
});
AssignmentSubmission.belongsTo(User, {
  foreignKey: 'studentId',
  as: 'student',
});

// Class announcements
Classroom.hasMany(ClassAnnouncement, {
  foreignKey: 'classroomId',
  as: 'announcements',
  onDelete: 'CASCADE',
});
ClassAnnouncement.belongsTo(Classroom, {
  foreignKey: 'classroomId',
  as: 'classroom',
});

User.hasMany(ClassAnnouncement, {
  foreignKey: 'authorId',
  as: 'classAnnouncements',
  onDelete: 'CASCADE',
});
ClassAnnouncement.belongsTo(User, {
  foreignKey: 'authorId',
  as: 'author',
});

// Comments (announcements + assignments; optional private for assignments)
Classroom.hasMany(Comment, {
  foreignKey: 'classroomId',
  as: 'comments',
  onDelete: 'CASCADE',
});
Comment.belongsTo(Classroom, { foreignKey: 'classroomId', as: 'classroom' });

User.hasMany(Comment, { foreignKey: 'authorId', as: 'commentsAuthored', onDelete: 'CASCADE' });
Comment.belongsTo(User, { foreignKey: 'authorId', as: 'author' });

Comment.belongsTo(User, { foreignKey: 'targetUserId', as: 'targetUser' });

Classroom.hasMany(CommentModerationRecord, {
  foreignKey: 'classroomId',
  as: 'commentModerationRecords',
  onDelete: 'SET NULL',
});
CommentModerationRecord.belongsTo(Classroom, { foreignKey: 'classroomId', as: 'classroom' });
Comment.hasMany(CommentModerationRecord, {
  foreignKey: 'commentId',
  as: 'moderationReports',
  onDelete: 'SET NULL',
});
CommentModerationRecord.belongsTo(Comment, { foreignKey: 'commentId', as: 'comment' });
User.hasMany(CommentModerationRecord, {
  foreignKey: 'reportedById',
  as: 'commentReportsFiled',
  onDelete: 'SET NULL',
});
CommentModerationRecord.belongsTo(User, { foreignKey: 'reportedById', as: 'reporter' });
CommentModerationRecord.belongsTo(User, { foreignKey: 'commentAuthorId', as: 'commentAuthor' });
CommentModerationRecord.belongsTo(User, { foreignKey: 'reviewedById', as: 'reviewer' });
CommentModerationRecord.hasMany(CommentModerationAction, {
  foreignKey: 'reportId',
  as: 'actions',
  onDelete: 'CASCADE',
});
CommentModerationAction.belongsTo(CommentModerationRecord, { foreignKey: 'reportId', as: 'report' });
CommentModerationAction.belongsTo(User, { foreignKey: 'actorId', as: 'actor' });

// Saved slides
User.hasMany(SavedSlide, { foreignKey: 'userId', as: 'savedSlides', onDelete: 'CASCADE' });
SavedSlide.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Course.hasMany(SavedSlide, { foreignKey: 'courseId', as: 'savedSlides', onDelete: 'CASCADE' });
SavedSlide.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });
Lesson.hasMany(SavedSlide, { foreignKey: 'lessonId', as: 'savedSlides', onDelete: 'CASCADE' });
SavedSlide.belongsTo(Lesson, { foreignKey: 'lessonId', as: 'lesson' });

// Chat messages
User.hasMany(ChatMessage, {
  foreignKey: 'userId',
  as: 'chatMessages',
  onDelete: 'CASCADE'
});
ChatMessage.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

// Financial profile (1:1)
User.hasOne(UserFinancialProfile, { foreignKey: 'userId', as: 'financialProfile', onDelete: 'CASCADE' });
UserFinancialProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Spaced-repetition review items (generic; one row per user+itemType+itemId)
User.hasMany(ReviewItem, { foreignKey: 'userId', as: 'reviewItems', onDelete: 'CASCADE' });
ReviewItem.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Essays (private essay memoriser)
User.hasMany(Essay, { foreignKey: 'userId', as: 'essays', onDelete: 'CASCADE' });
Essay.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Live hosted quiz sessions (Kahoot-style)
User.hasMany(LiveSession, { foreignKey: 'hostUserId', as: 'hostedLiveSessions', onDelete: 'CASCADE' });
LiveSession.belongsTo(User, { foreignKey: 'hostUserId', as: 'host' });
Lesson.hasMany(LiveSession, { foreignKey: 'lessonId', as: 'liveSessions', onDelete: 'CASCADE' });
LiveSession.belongsTo(Lesson, { foreignKey: 'lessonId', as: 'lesson' });
Classroom.hasMany(LiveSession, { foreignKey: 'classroomId', as: 'liveSessions' });
LiveSession.belongsTo(Classroom, { foreignKey: 'classroomId', as: 'classroom' });

LiveSession.hasMany(LiveParticipant, { foreignKey: 'sessionId', as: 'participants', onDelete: 'CASCADE' });
LiveParticipant.belongsTo(LiveSession, { foreignKey: 'sessionId', as: 'session' });
User.hasMany(LiveParticipant, { foreignKey: 'userId', as: 'liveParticipations' });
LiveParticipant.belongsTo(User, { foreignKey: 'userId', as: 'user' });

LiveSession.hasMany(LiveResponse, { foreignKey: 'sessionId', as: 'responses', onDelete: 'CASCADE' });
LiveResponse.belongsTo(LiveSession, { foreignKey: 'sessionId', as: 'session' });
LiveParticipant.hasMany(LiveResponse, { foreignKey: 'participantId', as: 'responses', onDelete: 'CASCADE' });
LiveResponse.belongsTo(LiveParticipant, { foreignKey: 'participantId', as: 'participant' });

// Financial Twin: CDR consent connections and their ingested transactions.
// CASCADE both ways so deleting a user removes every trace of ingested data,
// and revoking a connection can bulk-delete its transactions.
User.hasMany(CdrConnection, { foreignKey: 'userId', as: 'cdrConnections', onDelete: 'CASCADE' });
CdrConnection.belongsTo(User, { foreignKey: 'userId', as: 'user' });
CdrConnection.hasMany(CdrTransaction, { foreignKey: 'connectionId', as: 'transactions', onDelete: 'CASCADE' });
CdrTransaction.belongsTo(CdrConnection, { foreignKey: 'connectionId', as: 'connection' });

// CapletMark: AI-marked practice attempts (HSC Economics answer marker)
User.hasMany(MarkedAttempt, { foreignKey: 'userId', as: 'markedAttempts', onDelete: 'CASCADE' });
MarkedAttempt.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// One current personal study plan per student.
User.hasOne(StudyPlan, { foreignKey: 'userId', as: 'studyPlan', onDelete: 'CASCADE' });
StudyPlan.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(EconomicsExamSession, { foreignKey: 'userId', as: 'economicsExamSessions', onDelete: 'CASCADE' });
EconomicsExamSession.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Canonical learning platform: versioned curriculum graph and content mappings.
CurriculumOutcome.belongsTo(CurriculumOutcome, {
  foreignKey: 'parentId',
  as: 'parent',
});
CurriculumOutcome.hasMany(CurriculumOutcome, {
  foreignKey: 'parentId',
  as: 'children',
  onDelete: 'SET NULL',
});

CurriculumOutcome.hasMany(ContentOutcome, {
  foreignKey: 'outcomeId',
  as: 'contentMappings',
  onDelete: 'CASCADE',
});
ContentOutcome.belongsTo(CurriculumOutcome, {
  foreignKey: 'outcomeId',
  as: 'outcome',
});

// Versioned question bank and explicit outcome alignment.
Question.belongsTo(Question, {
  foreignKey: 'previousVersionId',
  as: 'previousVersion',
});
Question.hasOne(Question, {
  foreignKey: 'previousVersionId',
  as: 'nextVersion',
  onDelete: 'SET NULL',
});
User.hasMany(Question, {
  foreignKey: 'createdBy',
  as: 'createdQuestions',
  onDelete: 'SET NULL',
});
Question.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'creator',
});
User.hasMany(Question, {
  foreignKey: 'reviewedBy',
  as: 'reviewedQuestions',
  onDelete: 'SET NULL',
});
Question.belongsTo(User, {
  foreignKey: 'reviewedBy',
  as: 'reviewer',
});
Question.hasMany(QuestionOutcome, {
  foreignKey: 'questionId',
  as: 'outcomeMappings',
  onDelete: 'CASCADE',
});
QuestionOutcome.belongsTo(Question, {
  foreignKey: 'questionId',
  as: 'question',
});
CurriculumOutcome.hasMany(QuestionOutcome, {
  foreignKey: 'outcomeId',
  as: 'questionMappings',
  onDelete: 'CASCADE',
});
QuestionOutcome.belongsTo(CurriculumOutcome, {
  foreignKey: 'outcomeId',
  as: 'outcome',
});
Question.belongsToMany(CurriculumOutcome, {
  through: QuestionOutcome,
  foreignKey: 'questionId',
  otherKey: 'outcomeId',
  as: 'outcomes',
});
CurriculumOutcome.belongsToMany(Question, {
  through: QuestionOutcome,
  foreignKey: 'outcomeId',
  otherKey: 'questionId',
  as: 'questions',
});

// Resumable practice sessions are the shared container for all practice modes.
User.hasMany(PracticeSession, {
  foreignKey: 'userId',
  as: 'practiceSessions',
  onDelete: 'CASCADE',
});
PracticeSession.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});
CurriculumOutcome.hasMany(PracticeSession, {
  foreignKey: 'primaryOutcomeId',
  as: 'primaryPracticeSessions',
  onDelete: 'SET NULL',
});
PracticeSession.belongsTo(CurriculumOutcome, {
  foreignKey: 'primaryOutcomeId',
  as: 'primaryOutcome',
});
Classroom.hasMany(PracticeSession, {
  foreignKey: 'classroomId',
  as: 'practiceSessions',
  onDelete: 'SET NULL',
});
PracticeSession.belongsTo(Classroom, {
  foreignKey: 'classroomId',
  as: 'classroom',
});
Assignment.hasMany(PracticeSession, {
  foreignKey: 'assignmentId',
  as: 'practiceSessions',
  onDelete: 'SET NULL',
});
PracticeSession.belongsTo(Assignment, {
  foreignKey: 'assignmentId',
  as: 'assignment',
});

// Append-only outcome evidence and its derived per-user mastery state.
User.hasMany(LearningEvidence, {
  foreignKey: 'userId',
  as: 'learningEvidence',
  onDelete: 'CASCADE',
});
LearningEvidence.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});
CurriculumOutcome.hasMany(LearningEvidence, {
  foreignKey: 'outcomeId',
  as: 'learningEvidence',
  onDelete: 'RESTRICT',
});
LearningEvidence.belongsTo(CurriculumOutcome, {
  foreignKey: 'outcomeId',
  as: 'outcome',
});
Question.hasMany(LearningEvidence, {
  foreignKey: 'questionId',
  as: 'learningEvidence',
  onDelete: 'SET NULL',
});
LearningEvidence.belongsTo(Question, {
  foreignKey: 'questionId',
  as: 'question',
});
PracticeSession.hasMany(LearningEvidence, {
  foreignKey: 'practiceSessionId',
  as: 'evidence',
  onDelete: 'SET NULL',
});
LearningEvidence.belongsTo(PracticeSession, {
  foreignKey: 'practiceSessionId',
  as: 'practiceSession',
});
LearningEvidence.belongsTo(LearningEvidence, {
  foreignKey: 'revisionOfId',
  as: 'revisionOf',
});
LearningEvidence.hasOne(LearningEvidence, {
  foreignKey: 'revisionOfId',
  as: 'revision',
  onDelete: 'CASCADE',
});

User.hasMany(MasteryState, {
  foreignKey: 'userId',
  as: 'masteryStates',
  onDelete: 'CASCADE',
});
MasteryState.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});
CurriculumOutcome.hasMany(MasteryState, {
  foreignKey: 'outcomeId',
  as: 'masteryStates',
  onDelete: 'CASCADE',
});
MasteryState.belongsTo(CurriculumOutcome, {
  foreignKey: 'outcomeId',
  as: 'outcome',
});

// Durable product events with first-class learning and classroom dimensions.
User.hasMany(ProductEvent, {
  foreignKey: 'userId',
  as: 'productEvents',
  onDelete: 'CASCADE',
});
ProductEvent.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});
PracticeSession.hasMany(ProductEvent, {
  foreignKey: 'practiceSessionId',
  as: 'productEvents',
  onDelete: 'SET NULL',
});
ProductEvent.belongsTo(PracticeSession, {
  foreignKey: 'practiceSessionId',
  as: 'practiceSession',
});
Classroom.hasMany(ProductEvent, {
  foreignKey: 'classroomId',
  as: 'learningEvents',
  onDelete: 'SET NULL',
});
ProductEvent.belongsTo(Classroom, {
  foreignKey: 'classroomId',
  as: 'classroom',
});
CurriculumOutcome.hasMany(ProductEvent, {
  foreignKey: 'outcomeId',
  as: 'productEvents',
  onDelete: 'SET NULL',
});
ProductEvent.belongsTo(CurriculumOutcome, {
  foreignKey: 'outcomeId',
  as: 'outcome',
});

// Teacher verification and outcome-aware assignment configuration.
User.hasOne(TeacherProfile, {
  foreignKey: 'userId',
  as: 'teacherProfile',
  onDelete: 'CASCADE',
});
TeacherProfile.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});
TeacherProfile.belongsTo(User, {
  foreignKey: 'verifiedBy',
  as: 'verifier',
});
TeacherProfile.hasMany(TeacherVerificationAudit, {
  foreignKey: 'teacherProfileId',
  as: 'verificationAudits',
  onDelete: 'SET NULL',
});
TeacherVerificationAudit.belongsTo(TeacherProfile, { foreignKey: 'teacherProfileId', as: 'teacherProfile' });
TeacherVerificationAudit.belongsTo(User, { foreignKey: 'teacherUserId', as: 'teacher' });
TeacherVerificationAudit.belongsTo(User, { foreignKey: 'actorUserId', as: 'actor' });
Assignment.hasOne(OutcomeAssignmentConfig, {
  foreignKey: 'assignmentId',
  as: 'learningConfig',
  onDelete: 'CASCADE',
});
OutcomeAssignmentConfig.belongsTo(Assignment, {
  foreignKey: 'assignmentId',
  as: 'assignment',
});
User.hasMany(OutcomeAssignmentConfig, {
  foreignKey: 'createdBy',
  as: 'outcomeAssignmentsCreated',
  onDelete: 'CASCADE',
});
OutcomeAssignmentConfig.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'creator',
});

EditorWorkspace.hasMany(ContentRevision, {
  foreignKey: 'workspaceId',
  as: 'contentRevisions',
  onDelete: 'SET NULL',
});
ContentRevision.belongsTo(EditorWorkspace, {
  foreignKey: 'workspaceId',
  as: 'workspace',
});

// User-controlled privacy settings, consent history, and transparent AI logs.
User.hasOne(UserPrivacyPreference, {
  foreignKey: 'userId',
  as: 'privacyPreference',
  onDelete: 'CASCADE',
});
UserPrivacyPreference.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});
User.hasMany(ConsentRecord, {
  foreignKey: 'userId',
  as: 'consentRecords',
  onDelete: 'CASCADE',
});
ConsentRecord.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});
User.hasMany(GuardianConsentRequest, {
  foreignKey: 'userId',
  as: 'guardianConsentRequests',
  onDelete: 'CASCADE',
});
GuardianConsentRequest.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});
User.hasMany(AIInteraction, {
  foreignKey: 'userId',
  as: 'aiInteractions',
  onDelete: 'CASCADE',
});
AIInteraction.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});
EditorWorkspace.hasMany(AIInteraction, {
  foreignKey: 'workspaceId',
  as: 'aiInteractions',
  onDelete: 'CASCADE',
});
AIInteraction.belongsTo(EditorWorkspace, {
  foreignKey: 'workspaceId',
  as: 'workspace',
});
EditorWorkspace.hasMany(Question, {
  foreignKey: 'editorWorkspaceId',
  as: 'questions',
  onDelete: 'SET NULL',
});
Question.belongsTo(EditorWorkspace, {
  foreignKey: 'editorWorkspaceId',
  as: 'editorWorkspace',
});

User.hasMany(UploadedAsset, {
  foreignKey: 'userId',
  as: 'uploadedAssets',
  onDelete: 'CASCADE',
});
UploadedAsset.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});
EditorWorkspace.hasMany(UploadedAsset, {
  foreignKey: 'workspaceId',
  as: 'uploadedAssets',
  onDelete: 'CASCADE',
});
UploadedAsset.belongsTo(EditorWorkspace, {
  foreignKey: 'workspaceId',
  as: 'workspace',
});

EconomicSource.hasMany(EconomicSeries, {
  foreignKey: 'sourceId',
  as: 'series',
  onDelete: 'RESTRICT',
});
EconomicSeries.belongsTo(EconomicSource, {
  foreignKey: 'sourceId',
  as: 'source',
});
EconomicSeries.hasMany(EconomicObservation, {
  foreignKey: 'seriesId',
  as: 'observations',
  onDelete: 'CASCADE',
});
EconomicObservation.belongsTo(EconomicSeries, {
  foreignKey: 'seriesId',
  as: 'series',
});
EconomicSource.hasMany(EconomicIngestionRun, {
  foreignKey: 'sourceId',
  as: 'ingestionRuns',
  onDelete: 'CASCADE',
});
EconomicIngestionRun.belongsTo(EconomicSource, {
  foreignKey: 'sourceId',
  as: 'source',
});
EconomicSeries.hasMany(EconomicIngestionRun, {
  foreignKey: 'seriesId',
  as: 'ingestionRuns',
  onDelete: 'SET NULL',
});
EconomicIngestionRun.belongsTo(EconomicSeries, {
  foreignKey: 'seriesId',
  as: 'series',
});

CurriculumEdition.hasMany(CurriculumOutcome, {
  foreignKey: 'curriculumEditionId',
  as: 'outcomes',
  onDelete: 'SET NULL',
});
CurriculumOutcome.belongsTo(CurriculumEdition, {
  foreignKey: 'curriculumEditionId',
  as: 'edition',
});
CurriculumEdition.hasMany(Lesson, {
  foreignKey: 'curriculumEditionId',
  as: 'lessons',
  onDelete: 'SET NULL',
});
Lesson.belongsTo(CurriculumEdition, {
  foreignKey: 'curriculumEditionId',
  as: 'curriculumEdition',
});
CurriculumEdition.hasMany(Question, {
  foreignKey: 'curriculumEditionId',
  as: 'questions',
  onDelete: 'SET NULL',
});
Question.belongsTo(CurriculumEdition, {
  foreignKey: 'curriculumEditionId',
  as: 'curriculumEdition',
});

module.exports = {
  sequelize,
  User,
  Course,
  Module,
  Lesson,
  UserProgress,
  Survey,
  Classroom,
  ClassMembership,
  Assignment,
  AssignmentSubmission,
  ClassAnnouncement,
  Comment,
  CommentModerationRecord,
  CommentModerationAction,
  ChatMessage,
  EditorWorkspace,
  SavedSlide,
  UserFinancialProfile,
  ReviewItem,
  Essay,
  LiveSession,
  LiveParticipant,
  LiveResponse,
  CdrConnection,
  CdrTransaction,
  MarkedAttempt,
  StudyPlan,
  EconomicsExamSession,
  CurriculumOutcome,
  ContentOutcome,
  Question,
  QuestionOutcome,
  PracticeSession,
  LearningEvidence,
  MasteryState,
  ProductEvent,
  TeacherProfile,
  TeacherVerificationAudit,
  OutcomeAssignmentConfig,
  ContentRevision,
  AIInteraction,
  ConsentRecord,
  UserPrivacyPreference,
  GuardianConsentRequest,
  FeatureFlag,
  FeatureFlagAudit,
  BackupVerification,
  UploadedAsset,
  OperationalAlert,
  EconomicSource,
  EconomicSeries,
  EconomicObservation,
  EconomicIngestionRun,
  CurriculumEdition,
};
