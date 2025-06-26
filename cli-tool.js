#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import SnapshotManager from './snapshot-manager.js';
import ComparisonEngine from './comparison-engine.js';
import MultiSiteRunner from './multi-site-runner.js';

const snapshotManager = new SnapshotManager();
const comparisonEngine = new ComparisonEngine();
const multiSiteRunner = new MultiSiteRunner();

yargs(hideBin(process.argv))
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
    .command('test', 'Run API tests', {
        site: {
            describe: 'Run tests for specific client/site',
            type: 'string',
            alias: 's'
        }
    }, async (argv) => {
        if (!argv.site) {
            console.log('🔧 Available sites:');
            const sites = multiSiteRunner.listAvailableSites();
            sites.forEach(site => console.log(`  - ${site}`));
            console.log('\nUsage: apilens test --site <site-name>');
            return;
        }
        
        try {
            const result = await multiSiteRunner.runSiteTests(argv.site);
            
            console.log('\n📊 Run Summary:');
            console.log(`  Site: ${result.site}`);
            console.log(`  Run ID: ${result.runId}`);
            console.log(`  Total APIs: ${result.results.length}`);
            console.log(`  Successful: ${result.results.filter(r => r.success).length}`);
            console.log(`  Failed: ${result.results.filter(r => !r.success).length}`);
            console.log(`  Empty responses: ${result.results.filter(r => r.isEmpty).length}`);
            console.log(`  Log file: ${result.logFile}`);
        } catch (error) {
            console.error('❌ Error:', error.message);
            process.exit(1);
        }
    })
    .demandCommand(1, 'You need at least one command')
    .help()
    .argv;