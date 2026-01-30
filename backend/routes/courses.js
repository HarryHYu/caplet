const express = require('express');
const { Op } = require('sequelize');
const Course = require('../models/Course');
const Module = require('../models/Module');
const Lesson = require('../models/Lesson');
const UserProgress = require('../models/UserProgress');

const router = express.Router();

const includeModulesWithLessons = (whereLesson = { isPublished: true }) => [
  {
    model: Module,
    as: 'modules',
    required: false,
    include: [
      {
        model: Lesson,
        as: 'lessons',
        where: whereLesson,
        required: false
      }
    ]
  }
];

function sortCourseContent(course) {
  if (!course) return course;
  const modules = (course.modules || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  modules.forEach((m) => {
    m.lessons = (m.lessons || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  });
  course.modules = modules;
  return course;
}

// Get all published courses
router.get('/', async (req, res) => {
  try {
    const { category, level, search, page = 1, limit = 10 } = req.query;
    
    const whereClause = { isPublished: true };
    
    if (category) {
      whereClause.category = category;
    }
    
    if (level) {
      whereClause.level = level;
    }
    
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { shortDescription: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;
    
    const courses = await Course.findAndCountAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: includeModulesWithLessons()
    });

    const rows = courses.rows.map((c) => sortCourseContent(c.toJSON ? c.toJSON() : c));
    res.json({
      courses: rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(courses.count / limit),
        totalCourses: courses.count,
        hasNext: offset + courses.rows.length < courses.count,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get single course with lessons
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findOne({
      where: { 
        id: req.params.id,
        isPublished: true 
      },
      include: includeModulesWithLessons()
    });

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.json({ course: sortCourseContent(course.toJSON ? course.toJSON() : course) });
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get course categories
router.get('/categories/list', async (req, res) => {
  try {
    const categories = await Course.findAll({
      attributes: ['category'],
      where: { isPublished: true },
      group: ['category'],
      raw: true
    });

    const categoryList = categories.map(cat => cat.category);
    
    res.json({ categories: categoryList });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get featured courses
router.get('/featured/list', async (req, res) => {
  try {
    const courses = await Course.findAll({
      where: { 
        isPublished: true
      },
      include: includeModulesWithLessons(),
      order: [['createdAt', 'DESC']],
      limit: 6
    });

    const sorted = courses.map((c) => sortCourseContent(c.toJSON ? c.toJSON() : c));
    res.json({ courses: sorted });
  } catch (error) {
    console.error('Get featured courses error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
