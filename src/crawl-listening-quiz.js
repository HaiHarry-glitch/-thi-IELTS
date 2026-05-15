// Compatibility wrapper for the listening fix plan.
// Actual implementation lives in harvest-listening-quiz.js.
const { main } = require('./harvest-listening-quiz');

main().catch((e) => {
  console.error('\nFATAL:', e);
  process.exit(1);
});
