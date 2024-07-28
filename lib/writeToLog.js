const fs = require('fs');
const path = require('path');
const parentDir = path.join(__dirname, '..');
const logFilePath = path.join(parentDir, 'operation_log.txt');

// Not only writes to console, but also pushes to the log array, which is shown on the index page
module.exports = function writeToLog(message) {
  try {
  const logMsg = getAdjustedISODate(new Date()).replace(/[TZ]/g, " ") + " >> " + message;
  console.log(logMsg);
  // logsArray.unshift(logMsg);
  // if (logsArray.length > 10000) logsArray.pop(); // Keep the log from getting too big

  // Append the log message to the operation_log file
  fs.appendFile(logFilePath, logMsg + '\n', (err) => {
    if (err) {
      console.error('Error writing to log file', err);
    } else {
      trimLogFile(); // Trim the log file if it exceeds 10,000 lines
    }
  });
  } catch (err) {
    console.error('ERROR caught in writeToLog', err);
  }
};

// Function to trim the log file to the last 1000000 lines, row limit is set in the environment variables
function trimLogFile() {
  try {
    const ROW_LIMIT = process.env.ROW_LIMIT || 1000000
    const logData = fs.readFileSync(logFilePath, 'utf8');
    const logLines = logData.split('\n');
    if (logLines.length > 10000) {
      const trimmedData = logLines.slice(logLines.length - 10000).join('\n');
      fs.writeFileSync(logFilePath, trimmedData, 'utf8');
    }
  } catch (err) {
    if (err.code !== 'ENOENT') { // Ignore file not found error
      console.error('ERROR caught in trimLogFile', err);
    }
  }
}

function getAdjustedISODate(date) {
	// Get the timezone offset in minutes
	const offsetMinutes = date.getTimezoneOffset();
	
	// Convert offset from minutes to milliseconds
	const offsetMillis = offsetMinutes * 60 * 1000;
	
	// Adjust the date by adding the offset in milliseconds
	const adjustedDate = new Date(date.getTime() - offsetMillis);
	
	// Convert the adjusted date to an ISO string
	return adjustedDate.toISOString();
}
