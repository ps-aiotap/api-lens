import fs from 'fs';
import path from 'path';

export class EndpointGrouper {
    constructor(options = {}) {
        this.patterns = new Map();
        this.customGroups = options.customGroups || {};
        this.openApiSpec = null;
        this.autoDetectPatterns = options.autoDetect !== false;
    }

    loadOpenApiSpec(specPath) {
        try {
            const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
            this.openApiSpec = spec;
            this.extractPatternsFromOpenApi();
        } catch (error) {
            console.log(`⚠️ Failed to load OpenAPI spec: ${error.message}`);
        }
    }

    extractPatternsFromOpenApi() {
        if (!this.openApiSpec?.paths) return;
        
        Object.keys(this.openApiSpec.paths).forEach(path => {
            const pattern = this.normalizePattern(path);
            this.patterns.set(pattern, {
                source: 'openapi',
                originalPath: path,
                methods: Object.keys(this.openApiSpec.paths[path])
            });
        });
    }

    groupUrl(url, method = 'GET') {
        // Remove query parameters and fragments
        const cleanUrl = url.split('?')[0].split('#')[0];
        
        // Check custom groups first
        for (const [groupName, regex] of Object.entries(this.customGroups)) {
            if (new RegExp(regex).test(cleanUrl)) {
                return groupName;
            }
        }

        // Check existing patterns
        for (const [pattern, info] of this.patterns) {
            if (this.matchesPattern(cleanUrl, pattern)) {
                return pattern;
            }
        }

        // Auto-detect new pattern
        if (this.autoDetectPatterns) {
            const detectedPattern = this.detectPattern(cleanUrl);
            this.patterns.set(detectedPattern, {
                source: 'auto-detected',
                count: 1
            });
            return detectedPattern;
        }

        return cleanUrl;
    }

    detectPattern(url) {
        let pattern = url;
        
        // Replace numeric IDs
        pattern = pattern.replace(/\/\d+/g, '/*');
        
        // Replace UUIDs
        pattern = pattern.replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/*');
        
        // Replace common ID patterns
        pattern = pattern.replace(/\/[a-zA-Z0-9_-]{20,}/g, '/*');
        
        // Normalize consecutive wildcards
        pattern = pattern.replace(/\/\*+/g, '/*');
        
        return pattern;
    }

    normalizePattern(pattern) {
        // Convert OpenAPI path parameters to wildcards
        return pattern.replace(/\{[^}]+\}/g, '*');
    }

    matchesPattern(url, pattern) {
        const regex = pattern
            .replace(/\*/g, '[^/]+')
            .replace(/\//g, '\\/');
        return new RegExp(`^${regex}$`).test(url);
    }

    getGroupStats(apiData) {
        const groupStats = new Map();
        
        apiData.forEach(api => {
            const group = this.groupUrl(api.url, api.method);
            
            if (!groupStats.has(group)) {
                groupStats.set(group, {
                    group: group,
                    total: 0,
                    passed: 0,
                    failed: 0,
                    empty: 0,
                    totalLatency: 0,
                    avgLatency: 0,
                    apis: []
                });
            }
            
            const stats = groupStats.get(group);
            stats.total++;
            stats.totalLatency += api.latency || 0;
            
            if (api.status >= 400) {
                stats.failed++;
            } else {
                stats.passed++;
            }
            
            if (api.isEmpty) {
                stats.empty++;
            }
            
            stats.apis.push(api);
            stats.avgLatency = stats.totalLatency / stats.total;
        });
        
        return Array.from(groupStats.values());
    }

    exportPatterns(filePath) {
        const exportData = {
            patterns: Object.fromEntries(this.patterns),
            customGroups: this.customGroups,
            timestamp: new Date().toISOString()
        };
        
        fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));
    }

    importPatterns(filePath) {
        try {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            this.patterns = new Map(Object.entries(data.patterns || {}));
            this.customGroups = data.customGroups || {};
        } catch (error) {
            console.log(`⚠️ Failed to import patterns: ${error.message}`);
        }
    }
}