#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting The Grassroots Scout - Production Mode\n');

const processes = [];

// Start team-roster-server (main API with all endpoints)
console.log('📡 Starting Team Roster Server (port 3002)...');
const teamRosterServer = spawn('node', ['team-roster-server.js'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'inherit',
  env: { ...process.env }
});
processes.push(teamRosterServer);

// Serve static frontend
console.log('🌐 Starting Frontend Server (port', process.env.PORT || 3000, ')...\n');
const serve = require('serve');
const handler = serve(path.join(__dirname, 'dist'), {
  public: true,
  cleanUrls: true,
  rewrites: [{ source: '**', destination: '/index.html' }]
});

const http = require('http');
const server = http.createServer(handler);
const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n✅ All servers running!');
  console.log(`📱 Frontend: http://localhost:${PORT}`);
  console.log(`🔧 API: http://localhost:3002/api`);
  console.log('\n💡 Note: Make sure frontend API calls use http://localhost:3002');
});

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\n⏹️  Shutting down...');
  processes.forEach(proc => proc.kill());
  server.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  Shutting down...');
  processes.forEach(proc => proc.kill());
  server.close();
  process.exit(0);
});
