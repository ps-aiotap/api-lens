const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 9879;

// Simple metrics endpoint
app.get('/metrics', (req, res) => {
    let metrics = '';
    
    // Read latest log files and convert to Prometheus format
    const logsDir = './logs';
    if (fs.existsSync(logsDir)) {
        const sites = fs.readdirSync(logsDir);
        
        for (const site of sites) {
            const siteDir = path.join(logsDir, site);
            if (fs.statSync(siteDir).isDirectory()) {
                const logFiles = fs.readdirSync(siteDir)
                    .filter(f => f.endsWith('.json'))
                    .sort()
                    .slice(-1); // Get latest file
                
                if (logFiles.length > 0) {
                    try {
                        const logFile = path.join(siteDir, logFiles[0]);
                        const data = JSON.parse(fs.readFileSync(logFile, 'utf8'));
                        
                        // Convert to Prometheus metrics
                        for (const result of data.results || []) {
                            const endpoint = result.endpoint.replace(/[^a-zA-Z0-9_]/g, '_');
                            
                            metrics += `apilens_calls_total{site="${site}",endpoint="${result.endpoint}"} 1\n`;
                            metrics += `apilens_fails_total{site="${site}",endpoint="${result.endpoint}"} ${result.success ? 0 : 1}\n`;
                            metrics += `apilens_latency_ms{site="${site}",endpoint="${result.endpoint}"} ${result.latency}\n`;
                            metrics += `apilens_empty_responses{site="${site}",endpoint="${result.endpoint}"} ${result.isEmpty ? 1 : 0}\n`;
                            
                            // Calculate health score
                            let healthScore = 100;
                            if (!result.success) healthScore -= 60;
                            if (result.isEmpty) healthScore -= 30;
                            if (result.latency > 1000) healthScore -= Math.min((result.latency / 1000) * 10, 10);
                            healthScore = Math.max(0, Math.floor(healthScore));
                            
                            metrics += `apilens_health_score{site="${site}",endpoint="${result.endpoint}"} ${healthScore}\n`;
                        }
                    } catch (error) {
                        console.error(`Error reading ${logFiles[0]}:`, error.message);
                    }
                }
            }
        }
    }
    
    res.set('Content-Type', 'text/plain');
    res.send(metrics);
});

app.listen(port, () => {
    console.log(`Simple metrics server running on http://localhost:${port}/metrics`);
});