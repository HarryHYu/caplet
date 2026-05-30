module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    await queryInterface.createTable('saved_slides', {
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
      courseId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'courses', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      lessonId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'lessons', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      slideIndex: {
        type: DataTypes.INTEGER,
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
    });

    await queryInterface.addIndex('saved_slides', ['userId'], {
      name: 'saved_slides_user_id_idx'
    });

    await queryInterface.addConstraint('saved_slides', {
      fields: ['userId', 'lessonId', 'slideIndex'],
      type: 'unique',
      name: 'saved_slides_user_lesson_slide_unique'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('saved_slides');
  }
};
