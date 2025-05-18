const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Go to the target page
  await page.goto('https://www.6b6t.org/en/shop ', { waitUntil: 'networkidle' });

  // Extract data (update selectors accordingly)
  const data = await page.evaluate(() => {
    const percentElement = document.querySelector('.percentage-selector'); // Replace with real selector
    const balanceElement = document.querySelector('.balance-selector');
    const timeElement = document.querySelector('.time-remaining-selector');

    return {
      percentage: percentElement ? percentElement.innerText.trim() : 'N/A',
      balance: balanceElement ? parseFloat(balanceElement.innerText.replace(/[^0-9.-]+/g,"")) : 0,
      timeRemaining: timeElement ? timeElement.innerText.trim() : 'N/A'
    };
  });

  console.log(`Percentage: ${data.percentage}%`);
  console.log(`Balance: $${data.balance}`);
  console.log(`Time Remaining: ${data.timeRemaining}`);

  // Load item costs from JSON file
  const fs = require('fs');
  const itemCosts = JSON.parse(fs.readFileSync('item_costs.json'));

  // Calculate which items can be bought
  const affordableItems = itemCosts.items
    .filter(item => item.cost <= data.balance)
    .sort((a, b) => a.cost - b.cost);

  const totalAffordable = affordableItems.reduce((sum, item) => sum + item.cost, 0);
  const canCompleteGoal = totalAffordable >= data.balance;

  // Output results
  const resultText = `
📊 **Current Status:**
- Percentage: ${data.percentage}%
- Balance: $${data.balance}
- Time Remaining: ${data.timeRemaining}

🛍️ **Affordable Items:**
${affordableItems.map(i => `- ${i.name}: $${i.cost}`).join('\n')}

🧮 Total Affordable Items Cost: $${totalAffordable.toFixed(2)}
✅ Goal Completion Possible: ${canCompleteGoal ? 'Yes' : 'No'}
`;

  console.log(resultText);

  // Log to file
  fs.appendFileSync('scrape_log.txt', `${new Date().toISOString()}\n${resultText}\n\n`);

  // Set outputs for GitHub Actions
  process.stdout.write(`::set-output name=percentage::${data.percentage}\n`);
  process.stdout.write(`::set-output name=balance::${data.balance}\n`);
  process.stdout.write(`::set-output name=time_remaining::${data.timeRemaining}\n`);
  process.stdout.write(`::set-output name=affordable_items::${encodeURIComponent(JSON.stringify(affordableItems))}\n`);

  await browser.close();
})();
