// VS Code sets ELECTRON_RUN_AS_NODE=1 in its terminal (since VS Code is an Electron app).
// Electron checks for the EXISTENCE of this variable, not its value,
// so setting it to "" is not enough — we must delete it entirely.
delete process.env.ELECTRON_RUN_AS_NODE;

const { execSync } = require('child_process');
const args = process.argv.slice(2).join(' ');
const cmd = `npx electron-vite ${args || 'dev'}`;

try {
  execSync(cmd, { stdio: 'inherit', cwd: process.cwd() });
} catch (e) {
  process.exit(e.status || 1);
}
