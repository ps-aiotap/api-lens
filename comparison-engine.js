class ComparisonEngine {
    constructor() {
        this.insights = [];
    }

    compare(currentSnapshot, previousSnapshot) {
        if (!previousSnapshot) {
            return {
                summary: "📊 First run - no comparison available",
                insights: ["🆕 Baseline established with " + currentSnapshot.summary.totalAPIs + " APIs"],
                details: {}
            };
        }

        this.insights = [];
        const details = {};

        // Compare API failures
        const failureComparison = this.compareFailures(currentSnapshot, previousSnapshot);
        details.failures = failureComparison;

        // Compare empty responses
        const emptyComparison = this.compareEmptyResponses(currentSnapshot, previousSnapshot);
        details.emptyResponses = emptyComparison;

        // Compare latency
        const latencyComparison = this.compareLatency(currentSnapshot, previousSnapshot);
        details.latency = latencyComparison;

        // Compare total APIs
        const totalComparison = this.compareTotalAPIs(currentSnapshot, previousSnapshot);
        details.totalAPIs = totalComparison;

        return {
            summary: this.generateSummary(),
            insights: this.insights,
            details: details
        };
    }

    compareFailures(current, previous) {
        const currentFailed = this.getFailedApis(current);
        const previousFailed = this.getFailedApis(previous);
        
        const newFailures = currentFailed.filter(api => !previousFailed.includes(api));
        const recoveredApis = previousFailed.filter(api => !currentFailed.includes(api));
        
        if (newFailures.length > 0) {
            this.insights.push(`🔺 ${newFailures.length} APIs failed today that didn't yesterday`);
        }
        
        if (recoveredApis.length > 0) {
            this.insights.push(`✅ ${recoveredApis.length} APIs recovered from previous failures`);
        }

        return {
            current: currentFailed.length,
            previous: previousFailed.length,
            newFailures: newFailures,
            recovered: recoveredApis,
            change: currentFailed.length - previousFailed.length
        };
    }

    compareEmptyResponses(current, previous) {
        const currentEmpty = current.summary.emptyResponses;
        const previousEmpty = previous.summary.emptyResponses;
        const currentTotal = current.summary.totalAPIs;
        const previousTotal = previous.summary.totalAPIs;
        
        const currentPercent = (currentEmpty / currentTotal) * 100;
        const previousPercent = (previousEmpty / previousTotal) * 100;
        const percentChange = currentPercent - previousPercent;
        
        if (Math.abs(percentChange) > 5) {
            const direction = percentChange > 0 ? 'up' : 'down';
            this.insights.push(`📉 Empty responses ${direction} ${Math.abs(percentChange).toFixed(1)}% since last scan`);
        }

        return {
            current: currentEmpty,
            previous: previousEmpty,
            currentPercent: currentPercent,
            previousPercent: previousPercent,
            change: percentChange
        };
    }

    compareLatency(current, previous) {
        const currentAvg = current.summary.avgLatency;
        const previousAvg = previous.summary.avgLatency;
        const latencyChange = currentAvg - previousAvg;
        
        if (Math.abs(latencyChange) > 100) {
            const direction = latencyChange > 0 ? 'increased' : 'decreased';
            this.insights.push(`⚠️ Avg latency ${direction} by ${Math.abs(latencyChange).toFixed(0)}ms`);
        }

        // Find APIs with significant latency changes
        const slowApis = this.findSlowApis(current, previous);
        if (slowApis.length > 0) {
            this.insights.push(`🐌 ${slowApis.length} endpoints showing increased latency`);
        }

        return {
            current: currentAvg,
            previous: previousAvg,
            change: latencyChange,
            slowApis: slowApis
        };
    }

    compareTotalAPIs(current, previous) {
        const currentTotal = current.summary.totalAPIs;
        const previousTotal = previous.summary.totalAPIs;
        const change = currentTotal - previousTotal;
        
        if (change !== 0) {
            const direction = change > 0 ? 'increased' : 'decreased';
            this.insights.push(`📊 Total APIs ${direction} by ${Math.abs(change)}`);
        }

        return {
            current: currentTotal,
            previous: previousTotal,
            change: change
        };
    }

    getFailedApis(snapshot) {
        return snapshot.apis
            .filter(api => api.status === 'fail')
            .map(api => api.id);
    }

    findSlowApis(current, previous) {
        const slowApis = [];
        const previousApiMap = new Map(previous.apis.map(api => [api.id, api]));
        
        current.apis.forEach(currentApi => {
            const previousApi = previousApiMap.get(currentApi.id);
            if (previousApi && currentApi.latency > previousApi.latency + 200) {
                slowApis.push({
                    id: currentApi.id,
                    url: currentApi.url,
                    currentLatency: currentApi.latency,
                    previousLatency: previousApi.latency,
                    increase: currentApi.latency - previousApi.latency
                });
            }
        });
        
        return slowApis;
    }

    generateSummary() {
        if (this.insights.length === 0) {
            return "✅ No significant changes detected";
        }
        
        return `📈 ${this.insights.length} changes detected`;
    }

    displayComparison(comparison) {
        console.log('\n' + '='.repeat(50));
        console.log('📊 API COMPARISON REPORT');
        console.log('='.repeat(50));
        console.log(`\n${comparison.summary}\n`);
        
        if (comparison.insights.length > 0) {
            comparison.insights.forEach(insight => console.log(insight));
        }
        
        console.log('\n' + '-'.repeat(30));
        console.log('📋 DETAILED METRICS:');
        console.log(`   Total APIs: ${comparison.details.totalAPIs?.current || 0} (${comparison.details.totalAPIs?.change >= 0 ? '+' : ''}${comparison.details.totalAPIs?.change || 0})`);
        console.log(`   Failures: ${comparison.details.failures?.current || 0} (${comparison.details.failures?.change >= 0 ? '+' : ''}${comparison.details.failures?.change || 0})`);
        console.log(`   Empty Responses: ${comparison.details.emptyResponses?.current || 0} (${comparison.details.emptyResponses?.change >= 0 ? '+' : ''}${comparison.details.emptyResponses?.change?.toFixed(1) || 0}%)`);
        console.log(`   Avg Latency: ${comparison.details.latency?.current?.toFixed(0) || 0}ms (${comparison.details.latency?.change >= 0 ? '+' : ''}${comparison.details.latency?.change?.toFixed(0) || 0}ms)`);
        console.log('='.repeat(50));
    }
}

module.exports = ComparisonEngine;