const fs = require('fs');
const path = require('path');

class SnapshotManager {
    constructor(snapshotsDir = './snapshots') {
        this.snapshotsDir = snapshotsDir;
        this.ensureSnapshotsDir();
    }

    ensureSnapshotsDir() {
        if (!fs.existsSync(this.snapshotsDir)) {
            fs.mkdirSync(this.snapshotsDir, { recursive: true });
        }
    }

    generateSnapshot(apiData) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const snapshot = {
            timestamp: new Date().toISOString(),
            runId: timestamp,
            summary: {
                totalAPIs: apiData.length,
                failures: apiData.filter(api => api.status >= 400).length,
                emptyResponses: apiData.filter(api => api.isEmpty).length,
                avgLatency: apiData.reduce((sum, api) => sum + api.latency, 0) / apiData.length
            },
            apis: apiData.map(api => ({
                id: this.generateApiId(api.url, api.method),
                url: api.url,
                method: api.method,
                status: api.status >= 400 ? 'fail' : 'pass',
                statusCode: api.status,
                isEmpty: api.isEmpty,
                latency: api.latency,
                size: api.size || 0
            }))
        };
        return snapshot;
    }

    generateApiId(url, method) {
        return `${method}_${url.replace(/[^a-zA-Z0-9]/g, '_')}`.substring(0, 100);
    }

    exportSnapshot(snapshot, format = 'json') {
        const filename = `snapshot_${snapshot.runId}.${format}`;
        const filepath = path.join(this.snapshotsDir, filename);

        if (format === 'json') {
            fs.writeFileSync(filepath, JSON.stringify(snapshot, null, 2));
        } else if (format === 'csv') {
            const csvHeader = 'id,url,method,status,statusCode,isEmpty,latency,size\n';
            const csvData = snapshot.apis.map(api => 
                `"${api.id}","${api.url}","${api.method}","${api.status}",${api.statusCode},${api.isEmpty},${api.latency},${api.size}`
            ).join('\n');
            fs.writeFileSync(filepath, csvHeader + csvData);
        }

        console.log(`📸 Snapshot exported: ${filename}`);
        return filepath;
    }

    getLatestSnapshot() {
        const files = fs.readdirSync(this.snapshotsDir)
            .filter(f => f.startsWith('snapshot_') && f.endsWith('.json'))
            .sort()
            .reverse();
        
        if (files.length === 0) return null;
        
        const latestFile = path.join(this.snapshotsDir, files[0]);
        return JSON.parse(fs.readFileSync(latestFile, 'utf8'));
    }

    getPreviousSnapshot() {
        const files = fs.readdirSync(this.snapshotsDir)
            .filter(f => f.startsWith('snapshot_') && f.endsWith('.json'))
            .sort()
            .reverse();
        
        if (files.length < 2) return null;
        
        const previousFile = path.join(this.snapshotsDir, files[1]);
        return JSON.parse(fs.readFileSync(previousFile, 'utf8'));
    }

    getSnapshotByRunId(runId) {
        const filename = `snapshot_${runId}.json`;
        const filepath = path.join(this.snapshotsDir, filename);
        
        if (!fs.existsSync(filepath)) return null;
        
        return JSON.parse(fs.readFileSync(filepath, 'utf8'));
    }

    listSnapshots() {
        return fs.readdirSync(this.snapshotsDir)
            .filter(f => f.startsWith('snapshot_') && f.endsWith('.json'))
            .map(f => f.replace('snapshot_', '').replace('.json', ''))
            .sort()
            .reverse();
    }
}

module.exports = SnapshotManager;