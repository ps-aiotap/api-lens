const { chromium } = require('playwright');
const fs = require('fs');
require('dotenv').config();

async function mapHealthmugAPIs() {
    let browser;
    const apiCalls = [];
    const siteMap = {
        pages: [],
        apis: [],
        navigation: []
    };

    try {
        console.log('🚀 Launching browser with network monitoring...');
        browser = await chromium.launch({ headless: false });
        const context = await browser.newContext();
        const page = await context.newPage();

        // Monitor network requests
        page.on('request', request => {
            const url = request.url();
            if (url.includes('/api/') || url.includes('healthmug.com') && request.resourceType() === 'xhr') {
                apiCalls.push({
                    method: request.method(),
                    url: url,
                    headers: request.headers(),
                    timestamp: new Date().toISOString()
                });
                console.log(`📡 API: ${request.method()} ${url}`);
            }
        });

        // Login flow
        console.log('🌐 Navigating to healthmug.com...');
        await page.goto('https://www.healthmug.com', { waitUntil: 'networkidle' });
        siteMap.pages.push({ url: page.url(), title: await page.title() });

        console.log('👤 Opening login...');
        await page.locator('svg.w-8.h-8.inline.text-white').first().click();
        await page.locator('.round-none.inline-flex.items-center.justify-center.relative.focus\\:outline-none.h-7.text-base.px-6.bg-warning.text-white.w-full.rounded-sm').click();

        console.log('📧 Logging in...');
        await page.locator('input[placeholder="Email ID / Mobile Number"]').fill(process.env.USER_EMAIL);
        await page.locator('text=Continue').click();
        await page.locator('input[type="password"]').fill(process.env.USER_PASSWORD);
        await page.locator('button[type="submit"]').click();
        await page.waitForTimeout(3000);

        console.log('🗺️ Mapping website...');
        
        // Navigate through main sections
        const sections = [
            { name: 'Home', selector: 'a[href="/"]' },
            { name: 'Categories', selector: 'text=Categories' },
            { name: 'Offers', selector: 'text=Offers' },
            { name: 'Cart', selector: 'svg[data-testid="cart-icon"]' },
            { name: 'Profile', selector: 'text=Profile' }
        ];

        for (const section of sections) {
            try {
                console.log(`📍 Visiting ${section.name}...`);
                await page.locator(section.selector).first().click();
                await page.waitForTimeout(2000);
                siteMap.pages.push({ 
                    section: section.name,
                    url: page.url(), 
                    title: await page.title() 
                });
                siteMap.navigation.push(section.name);
            } catch (error) {
                console.log(`⚠️ Could not access ${section.name}: ${error.message}`);
            }
        }

        // Search functionality
        try {
            console.log('🔍 Testing search...');
            await page.locator('input[placeholder*="Search"]').fill('medicine');
            await page.keyboard.press('Enter');
            await page.waitForTimeout(2000);
            siteMap.pages.push({ 
                section: 'Search',
                url: page.url(), 
                title: await page.title() 
            });
        } catch (error) {
            console.log('⚠️ Search not accessible');
        }

        siteMap.apis = apiCalls;
        
        // Save results
        fs.writeFileSync('healthmug_site_map.json', JSON.stringify(siteMap, null, 2));
        console.log('💾 Site map saved to healthmug_site_map.json');
        console.log(`📊 Total API calls captured: ${apiCalls.length}`);
        console.log(`📄 Total pages visited: ${siteMap.pages.length}`);

    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

mapHealthmugAPIs();