/**
 * Migration: create the marked_attempts table — CapletMark's AI-marked
 * practice attempts (see PRD: CapletMark HSC Economics Answer Marker).
 *
 * strengths/gaps/terminology are JSONB string arrays, mirroring the
 * essays.parsedStructure convention (portable to the SQLite dev fallback,
 * where JSONB is transparently stored as TEXT).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    await queryInterface.createTable('marked_attempts', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      subject: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'economics'
      },
      responseType: {
        type: DataTypes.STRING,
        allowNull: false
      },
      question: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      markValue: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      focusArea: {
        type: DataTypes.STRING,
        allowNull: true
      },
      studentAnswer: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      estimatedMark: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      band: {
        type: DataTypes.STRING,
        allowNull: false
      },
      strengths: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: []
      },
      gaps: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: []
      },
      terminology: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: []
      },
      modelAnswer: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      nextRecommendation: {
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
    });

    await queryInterface.addIndex('marked_attempts', ['userId', 'createdAt'], {
      name: 'marked_attempts_user_created_idx'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('marked_attempts');
  }
};
