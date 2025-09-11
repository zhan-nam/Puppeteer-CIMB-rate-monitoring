import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'node:fs/promises';

let stack = 0.0;
let count = 0;
let previous = null;
var prices = [];

let MIN_RATE = 0;
let MAX_RATE = 0;
let COMBINE_TOTAL_MID = 0;


(async () => {
    const SECOND = 1000;
    const MINUTE = SECOND * 60;
    const link = 'https://www.cimbclicks.com.sg/sgd-to-myr';

    puppeteer.use( StealthPlugin() );

    const browser = await puppeteer.launch({ headless: "new" });
    // const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    // await page.setViewport({ width: 0, height: 0 });

    let setting = await readSetting();
    setting = JSON.parse(setting);
    
    MIN_RATE = setting["minimum_rate"];
    MAX_RATE = setting["maximum_rate"];
    COMBINE_TOTAL_MID = setting["combine_to_find_mid"];

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
            await new Promise( (resolve) => {
                setTimeout(resolve, MINUTE * 1.5);
            });
        }
    } catch (error) {
        console.error('An unexpected error occurred:', error);
    } finally {
        await browser.close();
    }
})();

const readSetting = async () => {
    try {
        return await fs.readFile('./store/setting.json', 'utf-8');
    } catch (error) {
        return error;
    }
}

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