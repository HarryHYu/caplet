/**
 * Migration: Create initial database schema
 * Description: Creates all tables for the Caplet backend with proper foreign key constraints
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    // 1. User table (no dependencies)
    await queryInterface.createTable('users', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false
      },
      firstName: {
        type: DataTypes.STRING,
        allowNull: false
      },
      lastName: {
        type: DataTypes.STRING,
        allowNull: false
      },
      dateOfBirth: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      isEmailVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      role: {
        type: DataTypes.ENUM('student', 'instructor', 'admin'),
        defaultValue: 'student'
      },
      profilePicture: {
        type: DataTypes.STRING,
        allowNull: true
      },
      bio: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      preferences: {
        type: DataTypes.TEXT,
        defaultValue: '{"notifications":true,"emailUpdates":true,"theme":"light"}'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    }, { ifNotExists: true });

    // 2. Course table (no dependencies)
    await queryInterface.createTable('courses', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      shortDescription: {
        type: DataTypes.STRING,
        allowNull: false
      },
      category: {
        type: DataTypes.ENUM(
          'budgeting',
          'superannuation',
          'tax',
          'loans',
          'investment',
          'planning',
          'corporate-finance',
          'other'
        ),
        allowNull: false
      },
      level: {
        type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
        allowNull: false
      },
      duration: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      thumbnail: {
        type: DataTypes.STRING,
        allowNull: true
      },
      isPublished: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      isFree: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00
      },
      tags: {
        type: DataTypes.TEXT,
        defaultValue: '[]'
      },
      prerequisites: {
        type: DataTypes.TEXT,
        defaultValue: '[]'
      },
      learningOutcomes: {
        type: DataTypes.TEXT,
        defaultValue: '[]'
      },
      metadata: {
        type: DataTypes.TEXT,
        defaultValue: '{}'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    }, { ifNotExists: true });

    // 3. Survey table (no dependencies)
    await queryInterface.createTable('surveys', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      age: {
        type: DataTypes.STRING,
        allowNull: false
      },
      tracksSpending: {
        type: DataTypes.ENUM('yes', 'no'),
        allowNull: false
      },
      taughtAtSchool: {
        type: DataTypes.ENUM('yes', 'no'),
        allowNull: false
      },
      confidence: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      termsConfusing: {
        type: DataTypes.ENUM('yes', 'no'),
        allowNull: false
      },
      helpfulExplanations: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    }, { ifNotExists: true });

    // 4. Classroom table (depends on User)
    await queryInterface.createTable('classrooms', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      code: {
        type: DataTypes.STRING(16),
        allowNull: false,
        unique: true
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      createdBy: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    }, { ifNotExists: true });

    // 5. CheckIn table (depends on User)
    await queryInterface.createTable('check_ins', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      majorEvents: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      monthlyExpenses: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      goalsUpdate: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    }, { ifNotExists: true });

    // 6. Module table (depends on Course)
    await queryInterface.createTable('modules', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      courseId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'courses',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      isPublished: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    }, { ifNotExists: true });

    // 7. Lesson table (depends on Module)
    await queryInterface.createTable('lessons', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      moduleId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'modules',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      videoUrl: {
        type: DataTypes.STRING,
        allowNull: true
      },
      duration: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      order: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      lessonType: {
        type: DataTypes.ENUM('video', 'reading', 'quiz', 'exercise', 'assignment'),
        allowNull: false
      },
      isPublished: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      resources: {
        type: DataTypes.TEXT,
        defaultValue: '[]'
      },
      metadata: {
        type: DataTypes.TEXT,
        defaultValue: '{}'
      },
      slides: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    }, { ifNotExists: true });

    // 8. FinancialState table (depends on User)
    await queryInterface.createTable('financial_states', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      netWorth: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0
      },
      monthlyIncome: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0
      },
      monthlyExpenses: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0
      },
      savingsRate: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0
      },
      accounts: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      debts: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      goals: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    }, { ifNotExists: true });

    // 9. FinancialPlan table (depends on User and CheckIn)
    await queryInterface.createTable('financial_plans', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      checkInId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'check_ins',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      budgetAllocation: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      savingsStrategy: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      debtStrategy: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      goalTimelines: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      actionItems: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      insights: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    }, { ifNotExists: true });

    // 10. Summary table (depends on User)
    await queryInterface.createTable('summaries', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: ''
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    }, { ifNotExists: true });

    // 11. UserProgress table (depends on User, Course, Lesson)
    await queryInterface.createTable('user_progress', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      courseId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'courses',
          key: 'id'
        }
      },
      lessonId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'lessons',
          key: 'id'
        }
      },
      status: {
        type: DataTypes.ENUM('not_started', 'in_progress', 'completed'),
        defaultValue: 'not_started'
      },
      progressPercentage: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0.00
      },
      timeSpent: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      lastAccessedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      completedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      quizScores: {
        type: DataTypes.TEXT,
        defaultValue: '{}'
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      lastSlideIndex: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      bookmarks: {
        type: DataTypes.TEXT,
        defaultValue: '[]'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    }, { ifNotExists: true });

    // Create index for UserProgress unique constraint
    await queryInterface.addIndex('user_progress', ['userId', 'courseId', 'lessonId'], {
      unique: true,
      name: 'user_progress_userId_courseId_lessonId_unique',
      ifNotExists: true
    });

    // 12. ClassMembership table (depends on Classroom, User)
    await queryInterface.createTable('class_memberships', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      classroomId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'classrooms',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      role: {
        type: DataTypes.ENUM('teacher', 'student'),
        allowNull: false,
        defaultValue: 'student'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    }, { ifNotExists: true });

    // Create index for ClassMembership unique constraint
    await queryInterface.addIndex('class_memberships', ['classroomId', 'userId'], {
      unique: true,
      name: 'class_memberships_classroomId_userId_unique',
      ifNotExists: true
    });

    // 13. Assignment table (depends on Classroom, Course, Lesson)
    await queryInterface.createTable('assignments', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      classroomId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'classrooms',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      dueDate: {
        type: DataTypes.DATE,
        allowNull: true
      },
      courseId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'courses',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      lessonId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'lessons',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    }, { ifNotExists: true });

    // 14. AssignmentSubmission table (depends on Assignment, User)
    await queryInterface.createTable('assignment_submissions', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      assignmentId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'assignments',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      studentId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      status: {
        type: DataTypes.ENUM('assigned', 'completed'),
        defaultValue: 'assigned'
      },
      submittedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    }, { ifNotExists: true });

    // Create index for AssignmentSubmission unique constraint
    await queryInterface.addIndex('assignment_submissions', ['assignmentId', 'studentId'], {
      unique: true,
      name: 'assignment_submissions_assignmentId_studentId_unique',
      ifNotExists: true
    });

    // 15. ClassAnnouncement table (depends on Classroom, User)
    await queryInterface.createTable('class_announcements', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      classroomId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'classrooms',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      authorId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      attachments: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: '[]'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    }, { ifNotExists: true });

    // 16. Comment table (depends on Classroom, User)
    await queryInterface.createTable('comments', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      classroomId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'classrooms',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      commentableType: {
        type: DataTypes.STRING(32),
        allowNull: false
      },
      commentableId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      authorId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      isPrivate: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      targetUserId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    }, { ifNotExists: true });

    // Create indexes for Comment table
    await queryInterface.addIndex('comments', ['classroomId', 'commentableType', 'commentableId'], {
      name: 'comments_classroomId_commentableType_commentableId',
      ifNotExists: true
    });
    await queryInterface.addIndex('comments', ['authorId'], {
      name: 'comments_authorId',
      ifNotExists: true
    });
  },

  async down(queryInterface) {
    // Drop tables in reverse dependency order
    const tablesToDrop = [
      'comments',
      'class_announcements',
      'assignment_submissions',
      'assignments',
      'class_memberships',
      'user_progress',
      'summaries',
      'financial_plans',
      'financial_states',
      'lessons',
      'modules',
      'check_ins',
      'classrooms',
      'surveys',
      'courses',
      'users'
    ];

    for (const table of tablesToDrop) {
      await queryInterface.dropTable(table, { ifExists: true });
    }
  }
};
