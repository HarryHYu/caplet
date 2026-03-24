const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Course } = require('../models');

async function updateThumbnail() {
    const courseTitle = 'Corporate Finance PART 1';
    // High quality finance/tax document image
    const thumbnail = 'https://images.unsplash.com/photo-1554224155-1f8e21a78744?q=80&w=2670&auto=format&fit=crop';

    try {
        const [updatedCount] = await Course.update(
            { thumbnail },
            { where: { title: courseTitle } }
        );

        if (updatedCount > 0) {
            console.log(`✅ Successfully updated thumbnail for "${courseTitle}"`);
        } else {
            console.log(`❌ Course "${courseTitle}" not found in database.`);
        }
    } catch (error) {
        console.error('❌ Error updating thumbnail:', error);
    } finally {
        process.exit(0);
    }
}

updateThumbnail();
