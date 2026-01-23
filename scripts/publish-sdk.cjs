const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PACKAGES_DIR = path.join(__dirname, '../packages');
const PACKAGES = [
  'core',
  'vision-engine', // @lisa-sdk/vision
  'audio-engine',  // @lisa-sdk/hearing
  'ui-kit',        // @lisa-sdk/ui
  'markdown-renderer' // @lisa-sdk/markdown
];

const DRY_RUN = process.argv.includes('--dry-run');

console.log('\x1b[36m%s\x1b[0m', '🚀 Lisa SDK Publication Script');
console.log(DRY_RUN ? 'Running in DRY-RUN mode (no actual publish)\n' : 'Running in LIVE mode\n');

function runCommand(command, cwd) {
  try {
    console.log(`> ${command}`);
    execSync(command, { cwd, stdio: 'inherit' });
  } catch (error) {
    console.error(`\x1b[31mCommand failed: ${command}\x1b[0m`);
    process.exit(1);
  }
}

async function publishPackage(dirName) {
  const packagePath = path.join(PACKAGES_DIR, dirName);
  const pkgJson = require(path.join(packagePath, 'package.json'));
  const packageName = pkgJson.name;

  console.log(`\n📦 Processing \x1b[33m${packageName}\x1b[0m...`);

  // 1. Install dependencies
  console.log('  Installing dependencies...');
  runCommand('pnpm install', packagePath);

  // 2. Build
  console.log('  Building...');
  runCommand('pnpm build', packagePath);

  // 3. Publish
  console.log('  Publishing...');
  const publishCmd = DRY_RUN ? 'npm publish --dry-run' : 'npm publish --access public';
  
  try {
    runCommand(publishCmd, packagePath);
    console.log(`  ✅ \x1b[32m${packageName} published successfully!\x1b[0m`);
  } catch (e) {
    console.error(`  ❌ Failed to publish ${packageName}`);
  }
}

(async () => {
  // Ensure we are logged in to npm (only if not dry-run)
  if (!DRY_RUN) {
    try {
      execSync('npm whoami', { stdio: 'ignore' });
    } catch {
      console.error('\x1b[31mError: You are not logged in to npm. Please run `npm login` first.\x1b[0m');
      process.exit(1);
    }
  }

  // Publish Core first (others depend on it)
  await publishPackage('core');

  // Publish others
  for (const pkg of PACKAGES.filter(p => p !== 'core')) {
    await publishPackage(pkg);
  }

  console.log('\n\x1b[32m✨ All packages processed!\x1b[0m');
})();
