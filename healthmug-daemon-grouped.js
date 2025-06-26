import { chromium } from 'playwright';
import fs from 'fs';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { EndpointGrouper } from './endpoint-grouper.js';
import { PrometheusExporter } from './prometheus-exporter.js';
import { ReportGenerator } from './report-generator.js';
import { config } from 'dotenv';

config();

class HealthmugDaemonGrouped {
    constructor() {
        this.grouper = new EndpointGrouper({
            customGroups: {
                'api/products/*': '/api/products/',
                'api/cart/*': '/api/cart/',
                'api/search/*': '/api/search',
                'api/user/*': '/api/user/'
            }
        });
        this.prometheus = new PrometheusExporter();
        this.reporter = new ReportGenerator(this.grouper);
        this.apiData = [];
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

    async runScan(options = {}) {
        const startTime = Date.now();
        console.log(`🚀 Starting grouped API scan at ${new Date().toISOString()}`);
        
        let browser;
        let currentPage = 'Unknown';
        this.apiData = [];

        try {
            browser = await chromium.launch({ headless: true });
            const context = await browser.newContext();
            const page = await context.newPage();

            page.on('response', async response => {
                const url = response.url();
                if (url.includes('healthmug') || url.includes('/api/')) {
                    const startTime = response.request().startTime || Date.now();
                    const latency = Date.now() - startTime;
                    const statusCode = response.status();
                    
                    try {
                        const text = await response.text();
                        const isEmpty = !text || text.trim() === '' || text === '{}';
                        
                        this.apiData.push({
                            url: url,
                            method: response.request().method(),
                            status: statusCode,
                            isEmpty: isEmpty,
                            latency: latency,
                            size: text ? text.length : 0,
                            page: currentPage,
                            timestamp: new Date().toISOString()
                        });
                    } catch (e) {
                        this.apiData.push({
                            url: url,
                            method: response.request().method(),
                            status: statusCode,
                            isEmpty: true,
                            latency: latency,
                            size: 0,
                            page: currentPage,
                            timestamp: new Date().toISOString()
                        });
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
                console.log(`🌐 Scanning ${pageInfo.name}...`);
                await page.goto(pageInfo.url, { waitUntil: 'networkidle' });
                await page.waitForTimeout(3000);
                await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
                await page.waitForTimeout(2000);
            }

            currentPage = 'Search';
            await page.goto('https://www.healthmug.com');
            await page.locator('input[placeholder*="Search"]').first().fill('medicine');
            await page.keyboard.press('Enter');
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
        
        console.log(`✅ Scan completed in ${duration}s`);
        console.log(`📊 Captured ${this.apiData.length} API calls`);

        // Generate grouped analysis
        await this.analyzeAndReport(options);

        return this.apiData;
    }

    async analyzeAndReport(options = {}) {
        // Load OpenAPI spec if provided
        if (options.openapi) {
            this.grouper.loadOpenApiSpec(options.openapi);
        }

        // Generate group statistics
        const groupStats = this.grouper.getGroupStats(this.apiData);
        
        // Update Prometheus metrics
        this.prometheus.updateMetrics(this.apiData, groupStats);
        
        // Generate CLI report
        this.reporter.generateCliReport(this.apiData);
        
        // Generate file reports if requested
        if (options.jsonReport) {
            this.reporter.generateJsonReport(this.apiData, options.jsonReport);
        }
        
        if (options.htmlReport) {
            this.reporter.generateHtmlReport(this.apiData, options.htmlReport);
        }
        
        // Export patterns for future use
        if (options.exportPatterns) {
            this.grouper.exportPatterns(options.exportPatterns);
        }
    }

    async start(interval, maxRuns = null, options = {}) {
        console.log(`🔄 Starting grouped daemon with ${interval}min intervals`);
        
        // Start Prometheus server
        this.prometheus.start(3000);
        
        let runCount = 0;
        
        while (true) {
            runCount++;
            
            try {
                await this.runScan(options);
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

const argv = yargs(hideBin(process.argv))
    .option('interval', {
        alias: 'i',
        type: 'number',
        default: 15,
        description: 'Interval between scans in minutes'
    })
    .option('runs', {
        alias: 'r',
        type: 'number',
        description: 'Maximum number of runs'
    })
    .option('openapi', {
        type: 'string',
        description: 'Path to OpenAPI spec file'
    })
    .option('json-report', {
        type: 'string',
        description: 'Output path for JSON report'
    })
    .option('html-report', {
        type: 'string',
        description: 'Output path for HTML report'
    })
    .option('export-patterns', {
        type: 'string',
        description: 'Export detected patterns to file'
    })
    .help()
    .argv;

const daemon = new HealthmugDaemonGrouped();
daemon.start(argv.interval, argv.runs, {
    openapi: argv.openapi,
    jsonReport: argv.jsonReport,
    htmlReport: argv.htmlReport,
    exportPatterns: argv.exportPatterns
});