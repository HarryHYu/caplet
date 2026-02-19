/**
 * Seed script: Populate classrooms, memberships, assignments, and announcements.
 *
 * Usage:  node seed-classes.js
 *
 * This script:
 *   1. Finds or creates a teacher/admin user to own the classes.
 *   2. Creates several classrooms with unique codes.
 *   3. Adds the owner as a teacher member via ClassMembership.
 *   4. Creates sample assignments (some linked to existing courses/lessons).
 *   5. Creates sample announcements.
 */

const { sequelize } = require('./config/database');
const User = require('./models/User');
const Classroom = require('./models/Classroom');
const ClassMembership = require('./models/ClassMembership');
const Assignment = require('./models/Assignment');
const ClassAnnouncement = require('./models/ClassAnnouncement');
const Course = require('./models/Course');
const Lesson = require('./models/Lesson');

const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
};

async function seed() {
    try {
        // Just verify connection — tables already exist from server startup
        await sequelize.authenticate();
        console.log('✅ Database connected');

        // ------- Find an admin/instructor user to own the classes -------
        let owner = await User.findOne({ where: { role: 'admin' } });
        if (!owner) {
            owner = await User.findOne({ where: { role: 'instructor' } });
        }
        if (!owner) {
            console.error('❌ No admin or instructor user found. Please create one first (e.g. via register).');
            process.exit(1);
        }
        console.log(`👤 Using owner: ${owner.firstName} ${owner.lastName} (${owner.email})`);

        // ------- Fetch existing courses and lessons for linking -------
        const courses = await Course.findAll({ attributes: ['id', 'title'] });
        const lessons = await Lesson.findAll({ attributes: ['id', 'title', 'moduleId'] });
        console.log(`📚 Found ${courses.length} courses and ${lessons.length} lessons`);

        // ------- Define seed classes -------
        const classDefinitions = [
            {
                name: 'Year 11 Finance',
                description: 'Core financial literacy curriculum for Year 11 students. Covers budgeting, tax systems, and superannuation fundamentals.',
            },
            {
                name: 'Year 12 Advanced Corporate Finance',
                description: 'Advanced module covering capital markets, corporate governance, ESG frameworks, and portfolio theory for senior students.',
            },
            {
                name: 'Staff Development — Financial Systems',
                description: 'Internal professional development class for teaching staff on modern financial systems and pedagogical approaches.',
            },
        ];

        const createdClasses = [];

        for (const classDef of classDefinitions) {
            // Check if class with same name already exists
            let existing = await Classroom.findOne({ where: { name: classDef.name } });
            if (existing) {
                console.log(`⏩ Class "${classDef.name}" already exists, skipping`);
                createdClasses.push(existing);
                continue;
            }

            const code = generateCode();
            const classroom = await Classroom.create({
                name: classDef.name,
                description: classDef.description,
                code,
                createdBy: owner.id,
            });

            // Add owner as teacher member
            await ClassMembership.findOrCreate({
                where: { classroomId: classroom.id, userId: owner.id },
                defaults: { role: 'teacher' },
            });

            createdClasses.push(classroom);
            console.log(`✅ Created class: "${classroom.name}" (code: ${classroom.code})`);
        }

        // ------- Create sample assignments -------
        const now = new Date();
        const inOneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const inTwoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
        const inThreeWeeks = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);

        // Find a course and lesson to link
        const corpFinCourse = courses.find(c => c.title.toLowerCase().includes('corporate'));
        const firstLesson = lessons.length > 0 ? lessons[0] : null;

        const assignmentSets = [
            // Year 11 Finance assignments
            {
                classIndex: 0,
                assignments: [
                    {
                        title: 'Budget Planning Exercise',
                        description: 'Create a monthly budget using the 50/30/20 rule. Submit your completed budget spreadsheet with annotations explaining your allocation decisions.',
                        dueDate: inOneWeek,
                    },
                    {
                        title: 'Tax Return Simulation',
                        description: 'Complete the mock Australian tax return form using the provided income data. Calculate taxable income, deductions, and net tax payable.',
                        dueDate: inTwoWeeks,
                    },
                    {
                        title: 'Superannuation Comparison Report',
                        description: 'Research and compare three different superannuation funds. Analyse fees, performance, and investment options. Present your findings in a 500-word report.',
                        dueDate: inThreeWeeks,
                    },
                ],
            },
            // Year 12 Advanced Corporate Finance assignments
            {
                classIndex: 1,
                assignments: [
                    {
                        title: 'Corporate Governance Case Study',
                        description: 'Analyse the governance structure of an ASX-listed company. Identify potential agency conflicts and recommend improvements based on best practice frameworks.',
                        dueDate: inOneWeek,
                        courseId: corpFinCourse?.id || null,
                        lessonId: firstLesson?.id || null,
                    },
                    {
                        title: 'Capital Structure Analysis',
                        description: 'Calculate the weighted average cost of capital (WACC) for a given company scenario. Evaluate how changes in debt-to-equity ratio impact firm value.',
                        dueDate: inTwoWeeks,
                    },
                    {
                        title: 'ESG Portfolio Construction',
                        description: 'Construct a hypothetical portfolio of 10 ASX-listed securities that meets ESG screening criteria. Justify each selection with reference to ESG ratings and financial fundamentals.',
                        dueDate: inThreeWeeks,
                    },
                    {
                        title: 'Risk & Return Problem Set',
                        description: 'Complete the problem set covering standard deviation, beta calculations, and the Capital Asset Pricing Model (CAPM). Show all working.',
                        dueDate: inTwoWeeks,
                    },
                ],
            },
            // Staff Development assignments
            {
                classIndex: 2,
                assignments: [
                    {
                        title: 'Module Review: Financial Literacy Pedagogy',
                        description: 'Review the assigned reading on financial literacy teaching methodologies. Submit a reflection (300 words) on how these approaches could be integrated into your classroom.',
                        dueDate: inTwoWeeks,
                    },
                ],
            },
        ];

        for (const set of assignmentSets) {
            const classroom = createdClasses[set.classIndex];
            if (!classroom) continue;

            // Check if assignments already exist for this class
            const existingCount = await Assignment.count({ where: { classroomId: classroom.id } });
            if (existingCount > 0) {
                console.log(`⏩ Assignments already exist for "${classroom.name}", skipping`);
                continue;
            }

            for (const assignDef of set.assignments) {
                await Assignment.create({
                    classroomId: classroom.id,
                    title: assignDef.title,
                    description: assignDef.description,
                    dueDate: assignDef.dueDate,
                    courseId: assignDef.courseId || null,
                    lessonId: assignDef.lessonId || null,
                });
                console.log(`  📝 Assignment: "${assignDef.title}"`);
            }
        }

        // ------- Create sample announcements -------
        const announcementSets = [
            {
                classIndex: 0,
                announcements: [
                    {
                        content: 'Welcome to Year 11 Finance! Please ensure you have access to the Caplet platform and have completed the introductory survey before our first class. Looking forward to a great semester.',
                    },
                    {
                        content: 'Reminder: The Budget Planning Exercise is due next week. Make sure to use the 50/30/20 template provided in our resources section. Office hours are available Thursday 3-4pm if you need help.',
                    },
                ],
            },
            {
                classIndex: 1,
                announcements: [
                    {
                        content: 'Welcome to Year 12 Advanced Corporate Finance. This semester we will be exploring capital markets, governance structures, and ESG investing. The workload is substantial — please plan your time accordingly.',
                    },
                    {
                        content: 'Guest speaker announcement: Dr. Sarah Chen from the University of Melbourne will be joining us next Friday to discuss recent developments in sustainable finance. Attendance is expected.',
                    },
                    {
                        content: 'The Corporate Governance Case Study has been posted. Please select your company by end of day Wednesday and post your choice in the comments to avoid duplicates.',
                    },
                ],
            },
            {
                classIndex: 2,
                announcements: [
                    {
                        content: 'Welcome to the Staff Development program on Financial Systems. This term we are focusing on integrating financial literacy across the curriculum. Please review the pre-reading materials before our first session.',
                    },
                ],
            },
        ];

        for (const set of announcementSets) {
            const classroom = createdClasses[set.classIndex];
            if (!classroom) continue;

            // Check if announcements already exist for this class
            const existingCount = await ClassAnnouncement.count({ where: { classroomId: classroom.id } });
            if (existingCount > 0) {
                console.log(`⏩ Announcements already exist for "${classroom.name}", skipping`);
                continue;
            }

            for (const annDef of set.announcements) {
                await ClassAnnouncement.create({
                    classroomId: classroom.id,
                    authorId: owner.id,
                    content: annDef.content,
                    attachments: JSON.stringify([]),
                });
                console.log(`  📢 Announcement posted in "${classroom.name}"`);
            }
        }

        console.log('\n🎉 Class seeding complete!');
        console.log('\nSummary:');
        for (const cls of createdClasses) {
            const memberCount = await ClassMembership.count({ where: { classroomId: cls.id } });
            const assignmentCount = await Assignment.count({ where: { classroomId: cls.id } });
            const announcementCount = await ClassAnnouncement.count({ where: { classroomId: cls.id } });
            console.log(`  📋 "${cls.name}" — Code: ${cls.code} | ${memberCount} members | ${assignmentCount} assignments | ${announcementCount} announcements`);
        }

    } catch (error) {
        console.error('❌ Seed error:', error);
    } finally {
        await sequelize.close();
    }
}

seed();
