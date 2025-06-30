import fs from 'fs';
import path from 'path';

export class EndpointLearner {
    constructor(site) {
        this.site = site;
        this.logsDir = './logs';
        this.learnedEndpoints = new Set();
    }

    async learnFromLogs() {
        const siteLogsDir = path.join(this.logsDir, this.site);
        if (!fs.existsSync(siteLogsDir)) return [];

        const logFiles = fs.readdirSync(siteLogsDir)
            .filter(f => f.endsWith('.json'))
            .sort()
            .slice(-10); // Last 10 runs

        for (const logFile of logFiles) {
            const logPath = path.join(siteLogsDir, logFile);
            try {
                const data = JSON.parse(fs.readFileSync(logPath, 'utf8'));
                if (data.results) {
                    data.results.forEach(result => {
                        if (result.success && result.statusCode < 400) {
                            this.learnedEndpoints.add(result.endpoint);
                        }
                    });
                }
            } catch (error) {
                // Skip invalid log files
            }
        }

        return Array.from(this.learnedEndpoints).map(endpoint => ({
            path: endpoint,
            method: 'GET',
            timeout: 3000,
            retries: 1,
            learned: true
        }));
    }

    suggestEndpoints(baseUrl) {
        // Common API patterns based on URL structure
        const suggestions = [];
        
        if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
            suggestions.push(
                { path: '/health', method: 'GET', timeout: 2000, retries: 0 },
                { path: '/api/health', method: 'GET', timeout: 2000, retries: 0 },
                { path: '/status', method: 'GET', timeout: 2000, retries: 0 }
            );
        }

        return suggestions;
    }
}