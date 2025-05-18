const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto('https://www.6b6t.org/en/shop', { waitUntil: 'networkidle' });

    // Wait for essential elements to load (adjust selectors as needed)
    await page.waitForSelector('.percentage-selector', { timeout: 5000 });

    const percentageText = await page.locator('.percentage-selector').textContent();
    const balanceText = await page.locator('.balance-selector').textContent();
    const timeText = await page.locator('.time-remaining-selector').textContent();

    const percentage = parseFloat(percentageText?.replace(/[^\d.]/g, '') || '0');
    const balance = parseFloat(balanceText?.replace(/[^0-9.-]+/g, '') || '0');
    const timeRemaining = timeText?.trim() || 'Unknown';

    console.log(`Percentage: ${percentage}%`);
    console.log(`Balance: $${balance}`);
    console.log(`Time Remaining: ${timeRemaining}`);

    // Read item costs
    const itemCosts = JSON.parse(fs.readFileSync('item_costs.json', 'utf-8'));

    const affordableItems = itemCosts.items
      .filter(item => item.cost <= balance)
      .sort((a, b) => a.cost - b.cost);

    const totalAffordable = affordableItems.reduce((sum, item) => sum + item.cost, 0);
    const canCompleteGoal = totalAffordable >= balance;

    const resultText = `
📊 **Current Status:**
- Percentage: ${percentage}%
- Balance: $${balance}
- Time Remaining: ${timeRemaining}

🛍️ **Affordable Items:**
${affordableItems.map(i => `- ${i.name}: $${i.cost}`).join('\n')}

🧮 Total Affordable Items Cost: $${totalAffordable.toFixed(2)}
✅ Goal Completion Possible: ${canCompleteGoal ? 'Yes' : 'No'}
`.trim();

    console.log(resultText);

    // Log to file
    fs.appendFileSync('scrape_log.txt', `${new Date().toISOString()}\n${resultText}\n\n`);

    // Write to a JSON file for GitHub Action
    fs.writeFileSync('goal_progress.json', JSON.stringify({
      percentage,
      balance,
      timeRemaining,
      affordableItems
    }, null, 2));

    // Set GitHub Action outputs using environment file (recommended way)
    const outputFile = process.env.GITHUB_OUTPUT;
    if (outputFile) {
      fs.appendFileSync(outputFile, `site_percent=${percentage}\n`);
      fs.appendFileSync(outputFile, `balance=${balance}\n`);
      fs.appendFileSync(outputFile, `goal_progress=${((percentage / 100) * balance).toFixed(2)}\n`);
      fs.appendFileSync(outputFile, `affordable_items=${encodeURIComponent(JSON.stringify(affordableItems))}\n`);
    }

  } catch (err) {
    console.error('❌ Scraping failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
