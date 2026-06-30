/**
 * Migration: create the essays table for the essay memoriser.
 *
 * `parsedStructure` holds the AI segmentation (thesis / body paragraphs /
 * conclusion + per-paragraph quotes & techniques) as JSONB — the same type as
 * lessons.slides. On the SQLite dev fallback Sequelize stores JSONB as TEXT, so
 * createTable with a JSONB column is portable across both dialects.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    await queryInterface.createTable('essays', {
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
      title: {
        type: DataTypes.STRING,
        allowNull: false
      },
      originalText: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      parsedStructure: {
        type: DataTypes.JSONB,
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

    await queryInterface.addIndex('essays', ['userId'], {
      name: 'essays_user_id_idx'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('essays');
  }
};
