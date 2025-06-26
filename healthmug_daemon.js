const { chromium } = require('playwright');
const fs = require('fs');
const express = require('express');
const yargs = require('yargs');
require('dotenv').config();

class HealthmugDaemon {
    constructor() {
        this.metrics = {
            apilens_api_total: 0,
            apilens_api_failures: 0,
            apilens_api_empty_responses: 0,
            apilens_last_run_duration_seconds: 0,
            apilens_last_run_timestamp_seconds: 0
        };
        this.setupMetricsServer();
    }

    setupMetricsServer() {
        const app = express();
        app.get('/metrics', (req, res) => {
            const metricsText = Object.entries(this.metrics)
                .map(([key, value]) => `${key} ${value}`)
                .join('\n');
            res.set('Content-Type', 'text/plain');
            res.send(metricsText);
        });
        app.listen(3000, () => console.log('📊 Metrics server running on http://localhost:3000/metrics'));
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

    async runScan() {
        const startTime = Date.now();
        console.log(`🚀 Starting scan at ${new Date().toISOString()}`);
        
        let browser;
        let currentPage = 'Unknown';
        const scanResults = {
            totalAPIs: 0,
            httpFailures: 0,
            emptyResponses: 0,
            successfulCalls: 0
        };

        try {
            browser = await chromium.launch({ headless: true });
            const context = await browser.newContext();
            const page = await context.newPage();

            page.on('response', async response => {
                const url = response.url();
                if (url.includes('healthmug') || url.includes('/api/')) {
                    scanResults.totalAPIs++;
                    const statusCode = response.status();
                    
                    try {
                        const text = await response.text();
                        const isEmpty = !text || text.trim() === '' || text === '{}';
                        
                        if (statusCode >= 400) {
                            scanResults.httpFailures++;
                        } else if (isEmpty) {
                            scanResults.emptyResponses++;
                        } else {
                            scanResults.successfulCalls++;
                        }
                    } catch (e) {
                        scanResults.emptyResponses++;
                    }
                }
            });

            currentPage = 'Login';
            const loginSuccess = await this.login(page);
            if (!loginSuccess) {
                throw new Error('Login failed');
            }

            const pages = [
                { url: 'https://www.healthmug.com', name: 'Home' },
                { url: 'https://www.healthmug.com/products/beauty-and-personal-care/82', name: 'Beauty' },
                { url: 'https://www.healthmug.com/products/medicines/1', name: 'Medicines' },
                { url: 'https://www.healthmug.com/disease/diabetes/2', name: 'Diabetes' }
            ];

            for (const pageInfo of pages) {
                currentPage = pageInfo.name;
                await page.goto(pageInfo.url, { waitUntil: 'networkidle' });
                await page.waitForTimeout(5000);
                await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
                await page.waitForTimeout(3000);
            }

            currentPage = 'Search';
            await page.goto('https://www.healthmug.com');
            await page.locator('input[placeholder*="Search"]').first().fill('medicine');
            await page.keyboard.press('Enter');
            await page.waitForTimeout(5000);
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await page.waitForTimeout(3000);

        } catch (error) {
            console.log(`❌ Scan error: ${error.message}`);
            throw error;
        } finally {
            if (browser) {
                await browser.close();
            }
        }

        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        
        // Update metrics
        this.metrics.apilens_api_total = scanResults.totalAPIs;
        this.metrics.apilens_api_failures = scanResults.httpFailures;
        this.metrics.apilens_api_empty_responses = scanResults.emptyResponses;
        this.metrics.apilens_last_run_duration_seconds = duration;
        this.metrics.apilens_last_run_timestamp_seconds = Math.floor(endTime / 1000);

        console.log(`✅ Scan completed at ${new Date().toISOString()}`);
        console.log(`   Duration: ${duration}s`);
        console.log(`   Total APIs: ${scanResults.totalAPIs}`);
        console.log(`   HTTP Failures: ${scanResults.httpFailures}`);
        console.log(`   Empty Responses: ${scanResults.emptyResponses}`);
        console.log(`   Successful: ${scanResults.successfulCalls}`);

        return scanResults;
    }

    async start(interval, maxRuns = null) {
        console.log(`🔄 Starting daemon with ${interval}min intervals${maxRuns ? ` (max ${maxRuns} runs)` : ' (infinite)'}`);
        
        let runCount = 0;
        
        while (true) {
            runCount++;
            
            try {
                await this.runScan();
            } catch (error) {
                console.log(`❌ Run ${runCount} failed: ${error.message}`);
            }
            
            if (maxRuns && runCount >= maxRuns) {
                console.log(`🏁 Completed ${maxRuns} runs, stopping daemon`);
                break;
            }
            
            console.log(`⏳ Waiting ${interval} minutes until next scan...`);
            await new Promise(resolve => setTimeout(resolve, interval * 60 * 1000));
        }
    }
}

const argv = yargs
    .option('interval', {
        alias: 'i',
        type: 'number',
        default: 15,
        description: 'Interval between scans in minutes'
    })
    .option('runs', {
        alias: 'r',
        type: 'number',
        description: 'Maximum number of runs (infinite if not specified)'
    })
    .help()
    .argv;

const daemon = new HealthmugDaemon();
daemon.start(argv.interval, argv.runs);