const { chromium } = require('playwright');
const fs = require('fs');
require('dotenv').config();

class APIMonitor {
    constructor() {
        this.monitorResults = [];
        this.testAPIs = [
            'https://www.healthmug.com/api/products',
            'https://www.healthmug.com/api/categories',
            'https://www.healthmug.com/api/user/profile',
            'https://www.healthmug.com/api/cart',
            'https://www.healthmug.com/api/search'
        ];
    }

    async login(page) {
        try {
            await page.goto('https://www.healthmug.com', { waitUntil: 'networkidle' });
            await page.locator('svg.w-8.h-8.inline.text-white').first().click();
            await page.locator('.round-none.inline-flex.items-center.justify-center.relative.focus\\:outline-none.h-7.text-base.px-6.bg-warning.text-white.w-full.rounded-sm').click();
            await page.locator('input[placeholder="Email ID / Mobile Number"]').fill(process.env.USER_EMAIL);
            await page.locator('text=Continue').click();
            await page.locator('input[placeholder="Password"]').fill(process.env.USER_PASSWORD);
            await page.locator('button.round-none.inline-flex.items-center.justify-center.relative.focus\\:outline-none.h-10.text-md.px-7.bg-warning.text-white.w-full.wavelet.rounded-sm').click();
            await page.waitForTimeout(5000);
            return true;
        } catch (error) {
            console.log(`❌ Login failed: ${error.message}`);
            return false;
        }
    }

    async monitorAPIs() {
        let browser;
        let currentPage = 'Unknown';
        const testResults = {
            timestamp: new Date().toISOString(),
            httpFailures: [],
            emptyResponses: [],
            successfulCalls: [],
            totalAPIs: 0,
            apiDetails: []
        };

        try {
            browser = await chromium.launch({ headless: true });
            const context = await browser.newContext();
            const page = await context.newPage();

            // Monitor API calls
            page.on('response', async response => {
                const url = response.url();
                if (url.includes('healthmug') || url.includes('/api/')) {
                    testResults.totalAPIs++;
                    const statusCode = response.status();
                    const timestamp = new Date().toISOString();
                    const method = response.request().method();
                    
                    const apiDetail = {
                        timestamp: timestamp,
                        url: url,
                        method: method,
                        statusCode: statusCode,
                        page: currentPage
                    };
                    
                    console.log(`📡 ${timestamp} [${currentPage}] ${method} ${statusCode} ${url}`);
                    
                    try {
                        const text = await response.text();
                        const isEmpty = !text || text.trim() === '' || text === '{}';
                        apiDetail.isEmpty = isEmpty;
                        
                        if (statusCode >= 400) {
                            apiDetail.type = 'HTTP_FAILURE';
                            testResults.httpFailures.push(apiDetail);
                        } else if (isEmpty) {
                            apiDetail.type = 'EMPTY_RESPONSE';
                            testResults.emptyResponses.push(apiDetail);
                        } else {
                            apiDetail.type = 'SUCCESS';
                            testResults.successfulCalls.push(apiDetail);
                        }
                    } catch (e) {
                        apiDetail.type = 'READ_ERROR';
                        apiDetail.error = 'Response read error';
                        testResults.emptyResponses.push(apiDetail);
                    }
                    
                    testResults.apiDetails.push(apiDetail);
                }
            });

            console.log(`🔍 Starting API monitoring at ${testResults.timestamp}`);
            
            currentPage = 'Login';
            const loginSuccess = await this.login(page);
            if (!loginSuccess) {
                testResults.loginError = 'Failed to login';
                return testResults;
            }

            // Navigate through key pages to trigger API calls
            const pages = [
                { url: 'https://www.healthmug.com', name: 'Home' },
                { url: 'https://www.healthmug.com/products/beauty-and-personal-care/82', name: 'Beauty & Personal Care' },
                { url: 'https://www.healthmug.com/products/medicines/1', name: 'Medicines' },
                { url: 'https://www.healthmug.com/disease/diabetes/2', name: 'Diabetes' }
            ];

            for (const pageInfo of pages) {
                try {
                    currentPage = pageInfo.name;
                    console.log(`🌐 Navigating to ${pageInfo.name}...`);
                    await page.goto(pageInfo.url, { waitUntil: 'networkidle' });
                    await page.waitForTimeout(5000);
                    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
                    await page.waitForTimeout(3000);
                } catch (error) {
                    console.log(`⚠️ Error visiting ${pageInfo.name}: ${error.message}`);
                }
            }

            // Test search to trigger more APIs
            try {
                currentPage = 'Search';
                console.log('🔍 Testing search functionality...');
                await page.goto('https://www.healthmug.com');
                await page.locator('input[placeholder*="Search"]').first().fill('medicine');
                await page.keyboard.press('Enter');
                await page.waitForTimeout(5000);
                await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
                await page.waitForTimeout(3000);
            } catch (error) {
                console.log('⚠️ Search test failed');
            }

        } catch (error) {
            testResults.monitorError = error.message;
        } finally {
            if (browser) {
                await browser.close();
            }
        }

        return testResults;
    }

    async startMonitoring() {
        const duration = 4 * 60 * 60 * 1000; // 4 hours
        const interval = 15 * 60 * 1000; // 15 minutes
        const startTime = Date.now();
        let testCount = 0;

        console.log('🚀 Starting 4-hour API monitoring (every 15 minutes)...');

        const runTest = async () => {
            testCount++;
            console.log(`\n📊 Running test ${testCount} at ${new Date().toISOString()}`);
            
            const results = await this.monitorAPIs();
            this.monitorResults.push(results);

            console.log(`✅ Test ${testCount} completed:`);
            console.log(`   Total APIs: ${results.totalAPIs}`);
            console.log(`   HTTP Failures: ${results.httpFailures.length}`);
            console.log(`   Empty Responses: ${results.emptyResponses.length}`);
            console.log(`   Successful Calls: ${results.successfulCalls.length}`);

            // Save results after each test
            fs.writeFileSync('healthmug_api_monitoring.json', JSON.stringify(this.monitorResults, null, 2));
            
            // Save CSV summary
            const csvData = this.monitorResults.map(r => 
                `"${r.timestamp}",${r.totalAPIs},${r.httpFailures.length},${r.emptyResponses.length},${r.successfulCalls.length}`
            ).join('\n');
            fs.writeFileSync('healthmug_monitoring_summary.csv', 
                'Timestamp,TotalAPIs,HTTPFailures,EmptyResponses,SuccessfulCalls\n' + csvData);
        };

        // Run first test immediately
        await runTest();

        // Schedule subsequent tests
        const intervalId = setInterval(async () => {
            if (Date.now() - startTime >= duration) {
                clearInterval(intervalId);
                console.log('\n🏁 4-hour monitoring completed!');
                console.log(`📊 Total tests run: ${testCount}`);
                console.log('💾 Results saved to healthmug_api_monitoring.json');
                return;
            }
            await runTest();
        }, interval);
    }
}

const monitor = new APIMonitor();
monitor.startMonitoring();