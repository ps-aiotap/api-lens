const { chromium } = require('playwright');
const fs = require('fs');
require('dotenv').config();

async function mapHealthmugComplete() {
    let browser;
    const apiLogs = [];
    const siteMap = { pages: [], navigation: [], apis: [] };

    try {
        console.log('🚀 Launching browser...');
        browser = await chromium.launch({ headless: false });
        const context = await browser.newContext();
        const page = await context.newPage();

        // Monitor API requests and responses
        page.on('request', request => {
            const startTime = Date.now();
            request.startTime = startTime;
        });

        page.on('response', async response => {
            const request = response.request();
            const url = request.url();
            const endTime = Date.now();
            const responseTime = endTime - (request.startTime || endTime);
            
            if (url.includes('healthmug') || url.includes('/api/')) {
                let isEmpty = true;
                try {
                    const text = await response.text();
                    isEmpty = !text || text.trim() === '' || text === '{}';
                } catch (e) {
                    isEmpty = true;
                }

                const logEntry = {
                    url: url,
                    method: request.method(),
                    statusCode: response.status(),
                    responseTime: responseTime,
                    isEmpty: isEmpty,
                    timestamp: new Date().toISOString()
                };
                
                apiLogs.push(logEntry);
                console.log(`📡 ${request.method()} ${response.status()} ${url} (${responseTime}ms)`);
            }
        });

        // Login flow
        console.log('🌐 Navigating to healthmug.com...');
        await page.goto('https://www.healthmug.com', { waitUntil: 'networkidle' });
        siteMap.pages.push({ name: 'Home', url: page.url(), title: await page.title() });

        console.log('👤 Opening user menu...');
        await page.locator('svg.w-8.h-8.inline.text-white').first().click();
        await page.waitForTimeout(1000);

        console.log('🔑 Clicking Login button...');
        await page.locator('.round-none.inline-flex.items-center.justify-center.relative.focus\\:outline-none.h-7.text-base.px-6.bg-warning.text-white.w-full.rounded-sm').click();
        await page.waitForTimeout(2000);

        console.log('📧 Entering email...');
        await page.locator('input[placeholder="Email ID / Mobile Number"]').fill(process.env.USER_EMAIL);
        console.log(`✅ Email entered: ${process.env.USER_EMAIL}`);

        console.log('➡️ Clicking Continue...');
        await page.locator('text=Continue').click();
        await page.waitForTimeout(2000);

        console.log('🔐 Entering password...');
        await page.locator('input[placeholder="Password"]').fill(process.env.USER_PASSWORD);
        console.log(`✅ Password entered: ${process.env.USER_PASSWORD}`);

        console.log('🚪 Clicking Login button...');
        await page.locator('button.round-none.inline-flex.items-center.justify-center.relative.focus\\:outline-none.h-10.text-md.px-7.bg-warning.text-white.w-full.wavelet.rounded-sm').click();
        await page.waitForTimeout(5000);
        console.log('✅ Login completed');

        // Map website sections
        const sections = [
            { name: 'Categories', selector: 'a[href*="category"], text=Categories' },
            { name: 'Offers', selector: 'a[href*="offer"], text=Offers' },
            { name: 'Cart', selector: 'a[href*="cart"], svg[data-testid="cart-icon"]' },
            { name: 'Profile', selector: 'a[href*="profile"], text=Profile' },
            { name: 'Orders', selector: 'a[href*="order"], text=Orders' }
        ];

        for (const section of sections) {
            try {
                console.log(`📍 Navigating to ${section.name}...`);
                await page.locator(section.selector).first().click();
                await page.waitForTimeout(3000);
                siteMap.pages.push({ 
                    name: section.name, 
                    url: page.url(), 
                    title: await page.title() 
                });
                siteMap.navigation.push(section.name);
                console.log(`✅ ${section.name} mapped`);
            } catch (error) {
                console.log(`⚠️ ${section.name} not accessible: ${error.message}`);
            }
        }

        // Test search
        try {
            console.log('🔍 Testing search...');
            await page.goto('https://www.healthmug.com');
            await page.locator('input[placeholder*="Search"], input[type="search"]').first().fill('medicine');
            await page.keyboard.press('Enter');
            await page.waitForTimeout(3000);
            siteMap.pages.push({ name: 'Search', url: page.url(), title: await page.title() });
            console.log('✅ Search functionality mapped');
        } catch (error) {
            console.log('⚠️ Search not accessible');
        }

        // Save results
        siteMap.apis = apiLogs;
        fs.writeFileSync('healthmug_complete_map.json', JSON.stringify(siteMap, null, 2));
        
        // Save API logs as CSV
        const csvHeader = 'URL,Method,StatusCode,ResponseTime,IsEmpty,Timestamp\n';
        const csvData = apiLogs.map(log => 
            `"${log.url}","${log.method}",${log.statusCode},${log.responseTime},${log.isEmpty},"${log.timestamp}"`
        ).join('\n');
        fs.writeFileSync('healthmug_api_logs.csv', csvHeader + csvData);

        console.log('💾 Complete map saved to healthmug_complete_map.json');
        console.log('💾 API logs saved to healthmug_api_logs.csv');
        console.log(`📊 Total API calls: ${apiLogs.length}`);
        console.log(`📄 Total pages mapped: ${siteMap.pages.length}`);

    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

mapHealthmugComplete();