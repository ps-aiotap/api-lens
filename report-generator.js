export class ReportGenerator {
    constructor(endpointGrouper) {
        this.grouper = endpointGrouper;
    }

    generateCliReport(apiData, comparison = null) {
        const groupStats = this.grouper.getGroupStats(apiData);
        
        console.log('\n' + '='.repeat(60));
        console.log('📊 API LENS - GROUPED ANALYSIS REPORT');
        console.log('='.repeat(60));
        
        // Overall summary
        console.log(`\n📈 OVERALL SUMMARY:`);
        console.log(`   Total APIs: ${apiData.length}`);
        console.log(`   Endpoint Groups: ${groupStats.length}`);
        console.log(`   Total Failures: ${apiData.filter(api => api.status >= 400).length}`);
        console.log(`   Empty Responses: ${apiData.filter(api => api.isEmpty).length}`);
        
        // Group-by-group analysis
        console.log(`\n🔍 ENDPOINT GROUP ANALYSIS:`);
        groupStats
            .sort((a, b) => b.total - a.total)
            .forEach(group => {
                const status = group.failed > 0 ? '❌' : '✅';
                const latencyWarning = group.avgLatency > 1000 ? '⚠️' : '';
                
                console.log(`\n${status} ${group.group}`);
                console.log(`   📦 ${group.passed} passed, ${group.failed} failed (${group.total} total)`);
                console.log(`   ⏱️  Avg latency: ${group.avgLatency.toFixed(0)}ms ${latencyWarning}`);
                
                if (group.empty > 0) {
                    console.log(`   📭 Empty responses: ${group.empty}`);
                }
            });
        
        // Comparison insights
        if (comparison && comparison.insights.length > 0) {
            console.log(`\n📊 COMPARISON INSIGHTS:`);
            comparison.insights.forEach(insight => console.log(`   ${insight}`));
        }
        
        console.log('\n' + '='.repeat(60));
    }

    generateJsonReport(apiData, outputPath) {
        const groupStats = this.grouper.getGroupStats(apiData);
        
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalApis: apiData.length,
                totalGroups: groupStats.length,
                totalFailures: apiData.filter(api => api.status >= 400).length,
                totalEmpty: apiData.filter(api => api.isEmpty).length
            },
            groups: groupStats.map(group => ({
                pattern: group.group,
                total: group.total,
                passed: group.passed,
                failed: group.failed,
                empty: group.empty,
                avgLatency: Math.round(group.avgLatency),
                apis: group.apis.map(api => ({
                    url: api.url,
                    method: api.method,
                    status: api.status,
                    latency: api.latency,
                    isEmpty: api.isEmpty
                }))
            }))
        };
        
        if (outputPath) {
            import('fs').then(fs => {
                fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
                console.log(`📄 JSON report saved to ${outputPath}`);
            });
        }
        
        return report;
    }

    generateHtmlReport(apiData, outputPath) {
        const groupStats = this.grouper.getGroupStats(apiData);
        
        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>API Lens Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .group { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .passed { color: green; }
        .failed { color: red; }
        .warning { color: orange; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 API Lens Report</h1>
        <p>Generated: ${new Date().toISOString()}</p>
        <p>Total APIs: ${apiData.length} | Groups: ${groupStats.length}</p>
    </div>
    
    ${groupStats.map(group => `
        <div class="group">
            <h3>${group.failed > 0 ? '❌' : '✅'} ${group.group}</h3>
            <p>
                <span class="passed">${group.passed} passed</span> | 
                <span class="failed">${group.failed} failed</span> | 
                <span class="${group.avgLatency > 1000 ? 'warning' : ''}">${group.avgLatency.toFixed(0)}ms avg</span>
            </p>
            <table>
                <tr><th>URL</th><th>Method</th><th>Status</th><th>Latency</th></tr>
                ${group.apis.slice(0, 10).map(api => `
                    <tr>
                        <td>${api.url}</td>
                        <td>${api.method}</td>
                        <td class="${api.status >= 400 ? 'failed' : 'passed'}">${api.status}</td>
                        <td>${api.latency}ms</td>
                    </tr>
                `).join('')}
                ${group.apis.length > 10 ? `<tr><td colspan="4">... and ${group.apis.length - 10} more</td></tr>` : ''}
            </table>
        </div>
    `).join('')}
</body>
</html>`;
        
        if (outputPath) {
            import('fs').then(fs => {
                fs.writeFileSync(outputPath, html);
                console.log(`📄 HTML report saved to ${outputPath}`);
            });
        }
        
        return html;
    }
}