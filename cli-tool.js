#!/usr/bin/env node

const yargs = require('yargs');
const SnapshotManager = require('./snapshot-manager');
const ComparisonEngine = require('./comparison-engine');

const snapshotManager = new SnapshotManager();
const comparisonEngine = new ComparisonEngine();

yargs
    .command('list', 'List all snapshots', {}, () => {
        const snapshots = snapshotManager.listSnapshots();
        console.log('📸 Available snapshots:');
        snapshots.forEach((runId, index) => {
            console.log(`  ${index + 1}. ${runId}`);
        });
    })
    .command('compare <run1> [run2]', 'Compare two snapshots', {
        run1: {
            describe: 'First run ID (or "latest")',
            type: 'string'
        },
        run2: {
            describe: 'Second run ID (defaults to previous)',
            type: 'string'
        }
    }, (argv) => {
        let snapshot1, snapshot2;
        
        if (argv.run1 === 'latest') {
            snapshot1 = snapshotManager.getLatestSnapshot();
        } else {
            snapshot1 = snapshotManager.getSnapshotByRunId(argv.run1);
        }
        
        if (argv.run2) {
            snapshot2 = snapshotManager.getSnapshotByRunId(argv.run2);
        } else {
            snapshot2 = snapshotManager.getPreviousSnapshot();
        }
        
        if (!snapshot1) {
            console.log('❌ First snapshot not found');
            return;
        }
        
        const comparison = comparisonEngine.compare(snapshot1, snapshot2);
        comparisonEngine.displayComparison(comparison);
    })
    .command('export <runId> <format>', 'Export snapshot in different format', {
        runId: {
            describe: 'Run ID to export',
            type: 'string'
        },
        format: {
            describe: 'Export format',
            choices: ['json', 'csv'],
            type: 'string'
        }
    }, (argv) => {
        const snapshot = snapshotManager.getSnapshotByRunId(argv.runId);
        if (!snapshot) {
            console.log('❌ Snapshot not found');
            return;
        }
        
        snapshotManager.exportSnapshot(snapshot, argv.format);
    })
    .command('summary [runId]', 'Show snapshot summary', {
        runId: {
            describe: 'Run ID (defaults to latest)',
            type: 'string'
        }
    }, (argv) => {
        const snapshot = argv.runId 
            ? snapshotManager.getSnapshotByRunId(argv.runId)
            : snapshotManager.getLatestSnapshot();
            
        if (!snapshot) {
            console.log('❌ Snapshot not found');
            return;
        }
        
        console.log(`📊 Snapshot Summary: ${snapshot.runId}`);
        console.log(`   Timestamp: ${snapshot.timestamp}`);
        console.log(`   Total APIs: ${snapshot.summary.totalAPIs}`);
        console.log(`   Failures: ${snapshot.summary.failures}`);
        console.log(`   Empty Responses: ${snapshot.summary.emptyResponses}`);
        console.log(`   Avg Latency: ${snapshot.summary.avgLatency.toFixed(0)}ms`);
    })
    .demandCommand(1, 'You need at least one command')
    .help()
    .argv;