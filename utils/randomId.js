// Utility to generate a random numeric ID (6 digits)
function generateRandomId() {
  // Generates a number between 100000 and 999999 inclusive
  return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports = { generateRandomId };

