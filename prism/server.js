#!/usr/bin/env node

/**
 * Prism Dashboard Server
 * Serves the live dashboard at http://localhost:3000
 * 
 * Run with: node server.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.url === '/' || req.url === '/dashboard') {
        const filePath = path.join(__dirname, 'dashboard.html');
        
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Dashboard not found');
                return;
            }
            
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(data);
        });
    } else if (req.url === '/api/status') {
        const status = {
            phase: 'VALIDATION',
            status: 'Ready for Execution',
            timestamp: new Date().toISOString(),
            progress: {
                completed: ['MVP Spec', 'Landing Page', 'Validation Research', 'Tech Stack', 'Progress Dashboard'],
                inProgress: ['GitHub Setup'],
                pending: ['Gmail Account', 'prismops.io Domain', 'Twitter Setup']
            },
            metrics: {
                mrr: 0,
                interviews: 0,
                validationScore: null
            },
            timeline: {
                validation: { start: '2026-03-16', end: '2026-03-22', status: 'upcoming' },
                build: { start: '2026-03-23', end: '2026-04-05', status: 'upcoming' },
                launch: { start: '2026-04-06', end: '2026-04-12', status: 'upcoming' },
                scale: { start: '2026-04-13', end: null, status: 'upcoming' }
            }
        };
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(status, null, 2));
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║         ⚡ Zenith's Prism Mission Dashboard                │
║                                                            │
║  🌐 http://localhost:${PORT}                                 │
║  📊 http://localhost:${PORT}/dashboard                      │
║  📡 http://localhost:${PORT}/api/status                    │
║                                                            │
║  Press Ctrl+C to stop                                     │
╚════════════════════════════════════════════════════════════╝
    `);
});
