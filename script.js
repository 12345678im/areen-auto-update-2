import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';

(async () => {
  const phones = (await fs.readFile('phones.txt', 'utf8')).split('\n').filter(Boolean);

  const resultPath = path.resolve('result.txt');
  const browser = await chromium.launch();

  for (const phone of phones) {
    const page = await browser.newPage();

    try {
      await page.goto('https://update.areen.net/', { waitUntil: 'networkidle' });

      await page.waitForSelector('#mobileNumber', { timeout: 30000 });
      await page.fill('#mobileNumber', phone);

      const value = await page.inputValue('#mobileNumber');
      if (value !== phone) {
        const msg = `❌ لم يتم إدخال الرقم بشكل صحيح`;
        console.error(`${msg}: ${phone}`);
        await fs.appendFile(resultPath, `${phone} → ${msg}\n`);
        await page.close();
        continue;
      }

      await page.waitForSelector('#submitBtn', { timeout: 10000, state: 'visible' });
      await page.click('#submitBtn');
      console.log(`📤 إرسال: ${phone}`);

      try {
        await page.waitForSelector('#result .alert-success, #result .alert-warning', { timeout: 2 * 60 * 1000 });
        const resultText = await page.textContent('#result .alert-success, #result .alert-warning');

        if (resultText.includes('Done') || resultText.includes('تم') || resultText.includes('בוצע')) {
          const msg = `✅ تم بنجاح`;
          console.log(`${msg}: ${phone}`);
          await fs.appendFile(resultPath, `${phone} → ${msg}\n`);
        } else {
          const msg = `⚠️ رسالة غير متوقعة: ${resultText.trim()}`;
          console.warn(`${msg}: ${phone}`);
          await fs.appendFile(resultPath, `${phone} → ${msg}\n`);
        }

      } catch (error) {
        const msg = `❌ لم تظهر نتيجة خلال دقيقتين`;
        console.error(`${msg}: ${phone}`);
        await fs.appendFile(resultPath, `${phone} → ${msg}\n`);
      }

    } catch (err) {
      const msg = `❌ فشل في المعالجة | الخطأ: ${err.message}`;
      console.error(`${msg}: ${phone}`);
      await fs.appendFile(resultPath, `${phone} → ${msg}\n`);
    }

    await page.close();
  }

  await browser.close();
})();
