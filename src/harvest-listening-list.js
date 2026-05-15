// Discover all Listening quizzes from youpass.vn API.
// Output: data/index/listening.json
const fs = require('fs-extra');
const path = require('path');
const { harvestAll } = require('./harvest-list');

(async () => {
  await harvestAll('listening', {
    types: [2, 10],          // 10 = main IELTS listening; 2 = older variants
    quiz_types: 3,
    status: 'published',
    is_test: 'true',
    isLogin: 'true',
    sort: 'practice_listing_priority.desc,simplified_id.asc',
  });
})().catch(e => { console.error('Loi:', e); process.exit(1); });
