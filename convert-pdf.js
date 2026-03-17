const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    const htmlPath = path.resolve('BUSINESS_PROPOSAL.html');
    const fileUrl = 'file://' + htmlPath.replace(/\\/g, '/');
    
    await page.goto(fileUrl, { waitUntil: 'networkidle2' });
    
    await page.pdf({
      path: 'BUSINESS_PROPOSAL.pdf',
      format: 'A4',
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
      printBackground: true
    });
    
    await browser.close();
    console.log('PDF created: BUSINESS_PROPOSAL.pdf');
  } catch (error) {
    console.error('Error:', error);
  }
})();
