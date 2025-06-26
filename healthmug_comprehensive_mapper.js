const { chromium } = require('playwright');
const fs = require('fs');
require('dotenv').config();

async function mapHealthmugComprehensive() {
    let browser;
    const apiLogs = [];
    const siteMap = { pages: [], navigation: [], apis: [] };

    try {
        console.log('🚀 Launching browser...');
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();

        // Monitor API requests and responses
        page.on('request', request => {
            request.startTime = Date.now();
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

                apiLogs.push({
                    url: url,
                    method: request.method(),
                    statusCode: response.status(),
                    responseTime: responseTime,
                    isEmpty: isEmpty,
                    timestamp: new Date().toISOString()
                });
                
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
        console.log(`✅ Password entered`);

        console.log('🚪 Clicking Login button...');
        await page.locator('button.round-none.inline-flex.items-center.justify-center.relative.focus\\:outline-none.h-10.text-md.px-7.bg-warning.text-white.w-full.wavelet.rounded-sm').click();
        await page.waitForTimeout(5000);
        console.log('✅ Login completed');

        // Extract all navigation menu items
        console.log('🗺️ Extracting navigation menu...');
        const menuItems = await page.locator('.group\\/topmenu.navigationMenuMain a').all();
        
        for (let i = 0; i < menuItems.length; i++) {
            try {
                const menuItem = menuItems[i];
                const href = await menuItem.getAttribute('href');
                const text = await menuItem.textContent();
                
                if (href && text) {
                    console.log(`📍 Visiting ${text.trim()}...`);
                    await page.goto(`https://www.healthmug.com${href}`, { waitUntil: 'networkidle' });
                    await page.waitForTimeout(2000);
                    
                    siteMap.pages.push({
                        name: text.trim(),
                        url: page.url(),
                        title: await page.title(),
                        href: href
                    });
                    
                    console.log(`✅ ${text.trim()} mapped`);
                }
            } catch (error) {
                console.log(`⚠️ Error mapping menu item: ${error.message}`);
            }
        }

        // Extract all subcategory, product, and disease links
        console.log('🔍 Extracting all subcategories and disease pages...');
        await page.goto('https://www.healthmug.com', { waitUntil: 'networkidle' });
        
        const allLinks = await page.locator('a[href^="/products/"], a[href^="/disease/"]').all();
        const uniqueLinks = new Set();
        
        for (let i = 0; i < allLinks.length; i++) {
            try {
                const link = allLinks[i];
                const href = await link.getAttribute('href');
                const text = await link.textContent();
                
                if (href && text && !uniqueLinks.has(href)) {
                    uniqueLinks.add(href);
                    const pageType = href.startsWith('/disease/') ? 'disease' : 'product';
                    console.log(`📍 Visiting ${pageType} ${text.trim()}...`);
                    await page.goto(`https://www.healthmug.com${href}`, { waitUntil: 'networkidle' });
                    await page.waitForTimeout(1000);
                    
                    siteMap.pages.push({
                        name: text.trim(),
                        url: page.url(),
                        title: await page.title(),
                        href: href,
                        type: pageType
                    });
                }
            } catch (error) {
                console.log(`⚠️ Error mapping page: ${error.message}`);
            }
        }

        // Test search functionality
        try {
            console.log('🔍 Testing search...');
            await page.goto('https://www.healthmug.com');
            await page.locator('input[placeholder*="Search"], input[type="search"]').first().fill('medicine');
            await page.keyboard.press('Enter');
            await page.waitForTimeout(3000);
            siteMap.pages.push({ name: 'Search Results', url: page.url(), title: await page.title() });
        } catch (error) {
            console.log('⚠️ Search not accessible');
        }

        // Save results
        siteMap.apis = apiLogs;
        fs.writeFileSync('healthmug_comprehensive_map.json', JSON.stringify(siteMap, null, 2));
        
        // Save API logs as CSV
        const csvHeader = 'URL,Method,StatusCode,ResponseTime,IsEmpty,Timestamp\n';
        const csvData = apiLogs.map(log => 
            `"${log.url}","${log.method}",${log.statusCode},${log.responseTime},${log.isEmpty},"${log.timestamp}"`
        ).join('\n');
        fs.writeFileSync('healthmug_api_logs.csv', csvHeader + csvData);

        console.log('💾 Comprehensive map saved to healthmug_comprehensive_map.json');
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

mapHealthmugComprehensive();