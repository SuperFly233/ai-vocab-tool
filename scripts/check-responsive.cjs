const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

const server = require('./browser-test-server.cjs').createServer();

(async () => {
  let browser;
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}) });
    for (const width of [320, 390, 768, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 844 }, hasTouch: width < 900 });
      const page = await context.newPage();
      await page.addInitScript(() => localStorage.setItem('ai_vocab_tool_offline_mode', '1'));
      await page.route('https://**/*', route => route.abort());
      await page.goto(`http://127.0.0.1:${server.address().port}`);
      await page.waitForFunction(() => typeof renderResult === 'function');
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      for (const long of [false, true]) {
        await page.evaluate(long => {
          const text = long ? 'antidisestablishmentarianism'.repeat(8) : 'clock';
          const result = {
            meta: { query: text, language: 'English' },
            headword: { title: text, coreMeaning: 'Notice', summary: text },
            senses: [{ shortestLabel: text, partOfSpeech: 'verb', meaning: text, example: text, translation: text }],
            collocations: [{ phrase: text, meaning: text, example: text, translation: text, note: text }],
            register: { style: text, tone: text, environment: text },
            confusions: [{ word: text, meaning: text, difference: text }],
          };
          setHistory([{ id: 1, query: text, raw: result, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]);
          currentHistoryId = 1;
          renderResult(result);
        }, long);
        await page.waitForTimeout(100);
        const measure = await page.evaluate(() => ({
          width: document.documentElement.clientWidth,
          scroll: document.documentElement.scrollWidth,
          result: document.querySelector('#result-card').getBoundingClientRect().width,
          resultRight: document.querySelector('#result-card').getBoundingClientRect().right,
          resultScroll: document.querySelector('#result-card').scrollWidth,
          tables: [...document.querySelectorAll('#result-card .table-scroll')].map(el => ({ width: el.clientWidth, scroll: el.scrollWidth })),
        }));
        console.log(JSON.stringify({ viewport: width, long, ...measure }));
        if(measure.resultScroll>Math.ceil(measure.result))console.log(await page.evaluate(()=>{
          const card=document.querySelector('#result-card'),rect=card.getBoundingClientRect();
          return [...card.querySelectorAll('*')].filter(el=>el.getBoundingClientRect().right>rect.right||el.scrollWidth>el.clientWidth+1).map(el=>({tag:el.tagName,class:el.className,right:el.getBoundingClientRect().right,width:el.clientWidth,scroll:el.scrollWidth}));
        }));
        assert.ok(measure.scroll <= measure.width, `Page overflow at ${width}px (${long ? 'long' : 'normal'}): ${measure.scroll}`);
        assert.ok(measure.resultRight<=measure.width+1,`Result clipped outside viewport at ${width}px: ${measure.resultRight}`);
        assert.ok(measure.resultScroll <= Math.ceil(measure.result), `Result content overflow at ${width}px: ${measure.resultScroll}`);
        if (process.env.QA_SCREENSHOTS) {
          fs.mkdirSync(process.env.QA_SCREENSHOTS, { recursive: true });
          await page.screenshot({ path: path.join(process.env.QA_SCREENSHOTS, `result-${width}-${long}.png`) });
        }
      }
      const bookmark = page.locator('#result-card .fragment-pin-btn').first();
      if (width < 900) await bookmark.tap();
      else await bookmark.click();
      await page.waitForFunction(() => getHistory()[0].fragmentPins?.length === 1);
      await page.evaluate(() => window.scrollTo(0, 700));
      await page.waitForTimeout(300);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
      const sticky=await page.locator('#view-home .editor-pane').boundingBox();
      assert.ok(sticky&&sticky.y>=0&&sticky.y<100,'Search toolbar stays visible after scrolling');
      console.log(JSON.stringify({viewport:width,scrolledToolbar:sticky}));
      if(process.env.QA_SCREENSHOTS)await page.screenshot({path:path.join(process.env.QA_SCREENSHOTS,`scrolled-${width}.png`)});
      await page.evaluate(() => openHistoryModal(1));
      await page.waitForTimeout(100);
      assert.ok(await page.evaluate(() => {
        const card = document.querySelector('.history-modal-card');
        const content = card.querySelector('.modal-page.active');
        return card.getBoundingClientRect().right <= innerWidth && content.scrollWidth <= content.clientWidth;
      }), `Detail content overflow at ${width}px`);
      assert.deepEqual(errors, [], 'Result interactions must not throw');
      await context.close();
    }
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
