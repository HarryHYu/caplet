require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { markEconomicsAnswer } = require('../services/economicsMarker');
const { evaluateMarker } = require('../services/markerEvaluation');

evaluateMarker(markEconomicsAnswer)
  .then((report) => {
    console.log(JSON.stringify(report, null, 2));
    process.exit(report.summary.passed ? 0 : 1);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
