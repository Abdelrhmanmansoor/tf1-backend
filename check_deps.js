
try {
  require('puppeteer');
  console.log('Puppeteer is installed.');
} catch (e) {
  console.log('Puppeteer is NOT installed.');
}

try {
  require('axios');
  console.log('Axios is installed.');
} catch (e) {
  console.log('Axios is NOT installed.');
}
