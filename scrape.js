const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto('https://www.6b6t.org/en/shop', { waitUntil: 'networkidle' });

    const widgetSelector = '.progress-bar .progress-text';

    await page.waitForSelector(widgetSelector, { timeout: 5000 });
    const percentageText = await page.locator(widgetSelector).textContent();
    const percentage = parseFloat(percentageText?.replace(/[^\d.]/g, '') || '0');

    // Screenshot milestone widget area
    const milestoneCard = await page.locator('.progress-bar').first();
    await milestoneCard.screenshot({ path: 'milestone.png' });

    const balance = 0;
    const timeRemaining = 'Unknown';

    // Read item costs
    const itemCosts = JSON.parse(fs.readFileSync('item_costs.json', 'utf-8'));

    const affordableItems = itemCosts.items
      .filter(item => item.cost <= balance)
      .sort((a, b) => a.cost - b.cost);

    const totalAffordable = affordableItems.reduce((sum, item) => sum + item.cost, 0);
    const canCompleteGoal = totalAffordable >= balance;

    // Output for workflow
    const outputFile = process.env.GITHUB_OUTPUT;
    if (outputFile) {
      fs.appendFileSync(outputFile, `site_percent=${percentage}\n`);
      fs.appendFileSync(outputFile, `affordable_items=${encodeURIComponent(JSON.stringify(affordableItems))}\n`);
    }

  } catch (err) {
    console.error('❌ Scraping failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
