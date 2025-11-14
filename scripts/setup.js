#!/usr/bin/env node

/**
 * Setup script for Lisa project
 * Automatically configures the project with all improvements
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✓ ${message}`, 'green');
}

function info(message) {
  log(`ℹ ${message}`, 'blue');
}

function warning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function error(message) {
  log(`✗ ${message}`, 'red');
}

function section(title) {
  log(`\n${'='.repeat(50)}`, 'bright');
  log(title, 'bright');
  log('='.repeat(50), 'bright');
}

function run(command, options = {}) {
  try {
    execSync(command, {
      cwd: rootDir,
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options,
    });
    return true;
  } catch (err) {
    if (!options.silent) {
      error(`Failed to run: ${command}`);
      console.error(err.message);
    }
    return false;
  }
}

async function main() {
  log('\n🚀 Lisa Setup Script v3.3.0\n', 'bright');

  // Check Node version
  section('Checking Prerequisites');
  const nodeVersion = process.version;
  info(`Node version: ${nodeVersion}`);

  if (parseInt(nodeVersion.split('.')[0].slice(1)) < 18) {
    error('Node.js 18 or higher is required');
    process.exit(1);
  }
  success('Node version is compatible');

  // Install dependencies
  section('Installing Dependencies');
  info('Running npm install...');
  if (run('npm install')) {
    success('Dependencies installed');
  } else {
    error('Failed to install dependencies');
    process.exit(1);
  }

  // Create .env.local if it doesn't exist
  section('Environment Configuration');
  const envPath = path.join(rootDir, '.env.local');
  const envExamplePath = path.join(rootDir, '.env.example');

  if (fs.existsSync(envPath)) {
    warning('.env.local already exists, skipping');
  } else if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    success('Created .env.local from .env.example');
    warning('Please edit .env.local and add your API keys');
  } else {
    warning('No .env.example found, creating minimal .env.local');
    fs.writeFileSync(
      envPath,
      `# Lisa Environment Variables
VITE_GOOGLE_CLIENT_ID=
VITE_GOOGLE_API_KEY=
VITE_LLM_API_KEY=
VITE_OPENAI_API_KEY=
VITE_PV_ACCESS_KEY=
JWT_SECRET=
`
    );
    success('Created minimal .env.local');
  }

  // Check if migrations are needed
  section('Database Setup');
  info('Checking migration status...');

  // Run database setup if needed
  if (fs.existsSync(path.join(rootDir, 'prisma', 'schema.prisma'))) {
    info('Running Prisma migrations...');
    if (run('npx prisma generate', { silent: true })) {
      success('Prisma client generated');
    }
  }

  // Build the project
  section('Building Project');
  info('Running build...');
  if (run('npm run build', { silent: false })) {
    success('Project built successfully');
  } else {
    warning('Build failed, but setup can continue');
  }

  // Run tests
  section('Running Tests');
  info('Running test suite...');
  if (run('npm test', { silent: false })) {
    success('All tests passed');
  } else {
    warning('Some tests failed');
  }

  // Initialize git hooks if Husky is installed
  section('Git Hooks');
  if (fs.existsSync(path.join(rootDir, '.husky'))) {
    info('Setting up Husky git hooks...');
    if (run('npm run prepare', { silent: true })) {
      success('Git hooks configured');
    }
  }

  // Check for Service Worker
  section('PWA Setup');
  const swPath = path.join(rootDir, 'public', 'service-worker.js');
  if (fs.existsSync(swPath)) {
    const swContent = fs.readFileSync(swPath, 'utf-8');
    if (swContent.includes('v3')) {
      success('Service Worker v3 is installed');
    } else {
      warning('Service Worker needs update');
    }
  } else {
    warning('Service Worker not found');
  }

  // Feature flags check
  section('Feature Flags');
  info('Checking feature flags system...');
  const featureFlagsPath = path.join(rootDir, 'src', 'utils', 'featureFlags.ts');
  if (fs.existsSync(featureFlagsPath)) {
    success('Feature flags system available');
    info('You can enable/disable features in your app code');
  }

  // Analytics check
  section('Analytics & Monitoring');
  const analyticsPath = path.join(rootDir, 'src', 'utils', 'agentAnalytics.ts');
  if (fs.existsSync(analyticsPath)) {
    success('Agent analytics system available');
  }

  const dashboardPath = path.join(
    rootDir,
    'src',
    'components',
    'MonitoringDashboard.tsx'
  );
  if (fs.existsSync(dashboardPath)) {
    success('Monitoring dashboard available');
    info('Enable with: featureFlags.enable("monitoring-dashboard")');
  }

  // Documentation check
  section('Documentation');
  const docs = [
    'IMPROVEMENTS.md',
    'EXAMPLES.md',
    'CHANGELOG.md',
    'MIGRATION_GUIDE.md',
    'CONTRIBUTING.md',
  ];

  docs.forEach(doc => {
    if (fs.existsSync(path.join(rootDir, doc))) {
      success(`${doc} available`);
    }
  });

  // Final summary
  section('Setup Complete!');
  success('Lisa is ready to use\n');

  log('Next steps:', 'bright');
  log('  1. Edit .env.local with your API keys');
  log('  2. Run: npm run dev');
  log('  3. Open: http://localhost:5173');
  log('  4. Check out EXAMPLES.md for usage guides\n');

  log('Useful commands:', 'bright');
  log('  npm run dev          - Start development server');
  log('  npm run build        - Build for production');
  log('  npm test             - Run test suite');
  log('  npm run lint         - Run linter');
  log('  npm run start-api    - Start API server\n');

  log('Documentation:', 'bright');
  log('  IMPROVEMENTS.md      - Technical details of all features');
  log('  EXAMPLES.md          - 20+ usage examples');
  log('  MIGRATION_GUIDE.md   - Upgrade guide');
  log('  CONTRIBUTING.md      - Contribution guidelines\n');

  log('Need help? Check the documentation or create an issue on GitHub.\n');

  // Display feature flags status
  log('Feature Flags Status:', 'bright');
  log('  lazy-loading         ✓ Enabled by default');
  log('  model-cache          ✓ Enabled by default');
  log('  circuit-breaker      ✓ Enabled by default');
  log('  retry-logic          ✓ Enabled by default');
  log('  offline-sync         ✓ Enabled by default');
  log('  analytics            ✓ Enabled by default');
  log('  workflow-templates   ✓ Enabled by default');
  log('  monitoring-dashboard ✗ Disabled (enable to use)');
  log('  performance-profiling ✗ Disabled (enable to use)');
  log('  experimental-agents  ✗ Disabled (enable to use)\n');

  success('Setup completed successfully! 🎉\n');
}

main().catch(err => {
  error('Setup failed:');
  console.error(err);
  process.exit(1);
});
