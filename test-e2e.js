import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Common Windows paths for Chrome Application
function findChromePath() {
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    path.join(os.homedir(), 'AppData\\Local\\Google\\Chrome\\Application\\chrome.exe')
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

async function runTest() {
  const chromePath = findChromePath();
  if (!chromePath) {
    console.error('❌ Error: Could not find Google Chrome installed on this Windows PC. Please ensure Chrome is installed at default path.');
    process.exit(1);
  }

  console.log(`🚀 Found Chrome at: ${chromePath}`);
  console.log('🔄 Launching headless browser to verify http://localhost:5173/ ...');

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Set desktop resolution
    await page.setViewport({ width: 1280, height: 800 });

    // Track console warnings and errors
    const consoleLogs = [];
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        consoleLogs.push(`[Console ${msg.type().toUpperCase()}] ${msg.text()}`);
      }
    });

    console.log('🌐 Navigating to exchange app...');
    const response = await page.goto('http://localhost:5173/', {
      waitUntil: 'networkidle2',
      timeout: 10000
    });

    console.log(`📡 Server response status: ${response.status()}`);

    // Wait for the app elements to load
    await page.waitForSelector('h1', { timeout: 5000 });
    console.log('✅ Page loaded successfully (Header title detected).');

    // Wait for the rates results
    console.log('⏳ Waiting for ExchangeRate-API data fetching to complete...');
    await page.waitForFunction(() => {
      const el = document.querySelector('[class*="resultValue"]');
      return el && el.textContent && el.textContent !== '---';
    }, { timeout: 10000 });

    const cnyOutput = await page.evaluate(() => {
      const el = document.querySelector('[class*="resultValue"]');
      return el ? el.textContent : 'none';
    });
    console.log(`💹 Current converted target output is: ${cnyOutput}`);

    // Capture visual snapshot
    const screenshotPath = 'C:\\Users\\15966\\.gemini\\antigravity-ide\\brain\\f811ee6d-614a-4329-9d10-f52318a31110\\e2e_screenshot.png';
    console.log('📸 Taking visual screenshot...');
    await page.screenshot({ path: screenshotPath });
    console.log(`✅ Visual screenshot saved to: ${screenshotPath}`);

    // Check console health
    if (consoleLogs.length > 0) {
      console.log('\n⚠️ Console warnings/errors during loading:');
      consoleLogs.forEach(log => console.log(`  ${log}`));
    } else {
      console.log('\n🟢 Console is completely clean. No errors detected.');
    }

    console.log('\n🎉 E2E Verification Finished: SUCCESS');
  } catch (err) {
    console.error('❌ E2E Verification failed with error:', err.message);
  } finally {
    await browser.close();
    console.log('🔌 Browser connection closed.');
  }
}

runTest();
