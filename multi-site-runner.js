#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import axios from 'axios';

class MultiSiteRunner {
    constructor() {
        this.configsDir = './configs';
        this.logsDir = './logs';
        this.pythonDir = './python';
    }

    async loadSiteConfig(site) {
        const configPath = path.join(this.configsDir, `${site}.json`);
        
        if (!fs.existsSync(configPath)) {
            throw new Error(`Config file not found: ${configPath}`);
        }

        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }

    async runSiteTests(site) {
        console.log(`🚀 Running tests for site: ${site}`);
        
        const config = await this.loadSiteConfig(site);
        
        
        const results = [];
        const runId = new Date().toISOString().replace(/[:.]/g, '-');
        
        // Ensure logs directory exists
        const siteLogsDir = path.join(this.logsDir, site);
        if (!fs.existsSync(siteLogsDir)) {
            fs.mkdirSync(siteLogsDir, { recursive: true });
        }

        for (const endpoint of config.endpoints) {
            console.log(`  📡 Testing ${endpoint.method} ${endpoint.path}`);
            
            const result = await this.testEndpoint(config, endpoint);
            result.site = site;
            result.runId = runId;
            results.push(result);
        }

        // Save results
        const logFile = path.join(siteLogsDir, `${runId}.json`);
        const logData = {
            site,
            runId,
            timestamp: new Date().toISOString(),
            config: config.site,
            results
        };

        fs.writeFileSync(logFile, JSON.stringify(logData, null, 2));
        console.log(`💾 Results saved to ${logFile}`);

        // Process with Python
        await this.processPythonAnalysis(site, logFile);

        return { site, runId, logFile, results };
    }

    async testEndpoint(config, endpoint) {
        const startTime = Date.now();
        const url = `${config.baseUrl}${endpoint.path}`;
        
        const axiosConfig = {
            method: endpoint.method,
            url,
            timeout: endpoint.timeout || config.settings.defaultTimeout,
            headers: {
                'User-Agent': config.settings.userAgent
            },
            validateStatus: () => true // Don't throw on HTTP errors
        };

        if (endpoint.body && (endpoint.method === 'POST' || endpoint.method === 'PUT')) {
            axiosConfig.data = endpoint.body;
            axiosConfig.headers['Content-Type'] = 'application/json';
        }

        let attempt = 0;
        const maxRetries = endpoint.retries || config.settings.defaultRetries;

        while (attempt <= maxRetries) {
            try {
                const response = await axios(axiosConfig);
                const endTime = Date.now();
                
                return {
                    endpoint: endpoint.path,
                    method: endpoint.method,
                    url,
                    statusCode: response.status,
                    latency: endTime - startTime,
                    responseSize: JSON.stringify(response.data || '').length,
                    isEmpty: !response.data || Object.keys(response.data).length === 0,
                    success: response.status >= 200 && response.status < 400,
                    timestamp: new Date().toISOString(),
                    attempt: attempt + 1
                };
            } catch (error) {
                attempt++;
                if (attempt > maxRetries) {
                    const endTime = Date.now();
                    return {
                        endpoint: endpoint.path,
                        method: endpoint.method,
                        url,
                        statusCode: error.response?.status || 0,
                        latency: endTime - startTime,
                        responseSize: 0,
                        isEmpty: true,
                        success: false,
                        error: error.message,
                        timestamp: new Date().toISOString(),
                        attempt
                    };
                }
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    async processPythonAnalysis(site, logFile) {
        return new Promise((resolve, reject) => {
            console.log(`🐍 Processing analysis for ${site}...`);
            
            const pythonScript = path.join(this.pythonDir, 'multi_site_processor.py');
            const pythonProcess = spawn('python', [pythonScript, site, logFile], {
                cwd: process.cwd(),
                stdio: 'inherit'
            });

            pythonProcess.on('close', (code) => {
                if (code === 0) {
                    console.log(`✅ Python analysis completed for ${site}`);
                    resolve();
                } else {
                    console.log(`⚠️ Python analysis failed with code ${code}`);
                    resolve(); // Don't fail the whole process
                }
            });

            pythonProcess.on('error', (error) => {
                console.log(`⚠️ Python process error: ${error.message}`);
                resolve(); // Don't fail the whole process
            });
        });
    }

    listAvailableSites() {
        if (!fs.existsSync(this.configsDir)) {
            return [];
        }

        return fs.readdirSync(this.configsDir)
            .filter(file => file.endsWith('.json'))
            .map(file => file.replace('.json', ''));
    }

    async run() {
        const args = process.argv.slice(2);
        const siteIndex = args.indexOf('--site');
        
        if (siteIndex === -1 || !args[siteIndex + 1]) {
            console.log('🔧 ApiLens Multi-Site Runner');
            console.log('Usage: node multi-site-runner.js --site <site-name>');
            console.log('');
            console.log('Available sites:');
            const sites = this.listAvailableSites();
            sites.forEach(site => console.log(`  - ${site}`));
            return;
        }

        const site = args[siteIndex + 1];
        
        try {
            const result = await this.runSiteTests(site);
            
            console.log('');
            console.log('📊 Run Summary:');
            console.log(`  Site: ${result.site}`);
            console.log(`  Run ID: ${result.runId}`);
            console.log(`  Total APIs: ${result.results.length}`);
            console.log(`  Successful: ${result.results.filter(r => r.success).length}`);
            console.log(`  Failed: ${result.results.filter(r => !r.success).length}`);
            console.log(`  Empty responses: ${result.results.filter(r => r.isEmpty).length}`);
            console.log(`  Log file: ${result.logFile}`);
            
            // Check for HTML report
            const htmlReport = result.logFile.replace('.json', '.html');
            if (fs.existsSync(htmlReport)) {
                console.log(`  📄 HTML Report: ${htmlReport}`);
            }
            
        } catch (error) {
            console.error('❌ Error:', error.message);
            process.exit(1);
        }
    }
}

export default MultiSiteRunner;

if (import.meta.url === `file://${process.argv[1]}`) {
    const runner = new MultiSiteRunner();
    runner.run();
}