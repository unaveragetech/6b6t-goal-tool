const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto('https://www.6b6t.org/en/shop', { waitUntil: 'networkidle' });

    // Get progress percentage
    await page.waitForSelector('.progress-bar .progress-text', { timeout: 5000 });
    const rawPercent = await page.locator('.progress-bar .progress-text').textContent();
    const percentage = parseFloat(rawPercent?.replace(/[^\d.]/g, '') || '0');

    // Placeholder values
    const balance = 0;
    const timeRemaining = 'Unknown';

    // Load item costs
    const itemCosts = JSON.parse(fs.readFileSync('item_costs.json', 'utf8'));
    const affordableItems = itemCosts.items
      .filter(item => item.cost <= balance)
      .sort((a, b) => a.cost - b.cost);

    const totalAffordable = affordableItems.reduce((sum, item) => sum + item.cost, 0);
    const canCompleteGoal = totalAffordable >= balance;

    // Construct display message
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

    // Save goal progress
    fs.writeFileSync('goal_progress.json', JSON.stringify({
      percentage,
      balance,
      timeRemaining,
      affordableItems
    }, null, 2));

    // Write GitHub Action outputs
    const outputFile = process.env.GITHUB_OUTPUT;
    if (outputFile) {
      fs.appendFileSync(outputFile, `percentage=${percentage}\n`);
      fs.appendFileSync(outputFile, `balance=${balance}\n`);
      fs.appendFileSync(outputFile, `time_remaining=${timeRemaining}\n`);
      fs.appendFileSync(
        outputFile,
        `formatted_items=${affordableItems.map(i => `- ${i.name} ($${i.cost})`).join('\\n')}\n`
      );
    }

  } catch (err) {
    console.error('❌ Scraping failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
