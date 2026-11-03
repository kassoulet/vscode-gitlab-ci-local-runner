import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main() {
  // macOS rejects unix socket paths over 103 chars; CI workspace paths are long.
  const profileDir = fs.mkdtempSync(path.join(process.platform === 'darwin' ? '/tmp' : os.tmpdir(), 'vscode-test-'));

  try {
    // The folder containing the Extension Manifest package.json
    // Passed to `--extensionDevelopmentPath`
    const extensionDevelopmentPath = path.resolve(__dirname, '../../');

    // The path to the extension test script
    // Passed to --extensionTestsPath
    const extensionTestsPath = path.resolve(__dirname, './suite/index');

    // Download VS Code, unzip it and run the integration test
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [
        `--user-data-dir=${path.join(profileDir, 'user-data')}`,
        `--extensions-dir=${path.join(profileDir, 'extensions')}`,
      ],
    });
  } catch (error) {
    console.error('Failed to run tests:', error);
    process.exit(1);
  } finally {
    fs.rmSync(profileDir, { recursive: true, force: true });
  }
}

main();
