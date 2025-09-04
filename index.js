import puppeteer from 'puppeteer';

const MIN_RATE = 3.3000;
const MAX_RATE = 3.3200;
const COMBINE_TOTAL_MID = 10;

let stack = 0.0;
let count = 0;
let previous = null;
var prices = [];

(async () => {
    const SECOND = 1000;
    const MINUTE = SECOND * 60;
    const link = 'https://www.cimbclicks.com.sg/sgd-to-myr';

    // const browser = await puppeteer.launch({ headless: 'new' });
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    await page.setViewport({ width: 0, height: 0 });

    try {
        await page.goto(link);
        console.log('start now');
        console.log(`Min: ${MIN_RATE};\nMax: ${MAX_RATE};\nCombine to find Mid: ${COMBINE_TOTAL_MID}\n`);

        while (true) {
            try {
                await page.waitForSelector('.rateStr', { timeout: 50000 });

                const rateStr = await page.$eval('.rateStr', (element) => element.innerText);
                conlog(rateStr);
            } catch (error) {
                console.error('Error waiting for or evaluating .rateStr:', error);
            }

            await page.reload();
            await page.waitForTimeout(MINUTE * 1.5);
        }
    } catch (error) {
        console.error('An unexpected error occurred:', error);
    } finally {
        await browser.close();
    }
})();

const conlog = async (rateStr) => {
    const temperatures = [ 10, 40, 41, 42, 43, 44, 45 ]; // cold to hot

    try {
        const CURR_RATE = parseFloat(rateStr.split("MYR ")[1]);
        const percentage = Math.min(((CURR_RATE - MIN_RATE) / (MAX_RATE - MIN_RATE)) * 100, 100);
        const index = Math.round((percentage / 100) * (temperatures.length - 1));

        if (!isNaN(CURR_RATE)) {
            stack += CURR_RATE;
            prices.push(CURR_RATE);
        }

        if (count > COMBINE_TOTAL_MID) {
            stack -= prices.shift();
        }

        count = prices.length;
        const mid = Math.round((stack/count) * 10000) / 10000;
        const vsprev = (previous == null || previous == CURR_RATE) ? "🔵" : (CURR_RATE < previous ? "🔴" : "🟢")
        const vsmid = CURR_RATE == mid ? "🔵" : (CURR_RATE < mid ? "🔴" : "🟢");

        if (CURR_RATE >= MIN_RATE) {
            console.log(`\x1b[38;5;${temperatures[index]}m%s\x1b[0m`, rateStr, `${vsprev} ${vsmid} (Mid: ${mid})`);
        } else {
            console.log(rateStr, `${vsprev} ${vsmid} (Mid: ${mid})`);
        }

        previous = CURR_RATE;
    } catch (error) {
        console.error('Error in conlog function:', error);
        console.log('Problematic rateStr:', rateStr);
    }
};