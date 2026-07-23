const fs = require('fs');

// Generate a dummy WebM file structure (just the header so it's a valid empty webm)
// This is a minimal valid Matroska/WebM header
const hex = "1A45DFA3010000000000001F4286810142F7810142F2810442F381084282847765626D428781024285810218538067010000000000000E1549A9660100000000000000";
const buffer = Buffer.from(hex, 'hex');

fs.writeFileSync('dummy.webm', buffer);
console.log('dummy.webm created');
