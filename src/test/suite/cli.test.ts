import * as assert from 'assert';
import { execFileSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { extensionPath, withTempDir } from './helpers';

const ciFile = `stages: [test]

hello:
  stage: test
  script:
    - echo "hello-from-gitlab-ci-local"
`;

function initRepo(dir: string): void {
	fs.writeFileSync(path.join(dir, '.gitlab-ci.yml'), ciFile);
	const git = (...args: string[]) => execFileSync('git', args, { cwd: dir, stdio: 'ignore' });
	git('init', '-q');
	git('remote', 'add', 'origin', 'https://gitlab.com/fake/repo.git');
	git('add', '.');
	git('-c', 'user.email=test@example.com', '-c', 'user.name=test', 'commit', '-qm', 'init');
}

function runCli(cwd: string, args: string[]): Promise<{ code: number | null; output: string }> {
	const cliPath = path.join(extensionPath, 'node_modules', 'gitlab-ci-local', 'dist', 'index.js');
	return new Promise((resolve, reject) => {
		const child = spawn(process.execPath, [cliPath, ...args], {
			cwd,
			env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
		});
		let output = '';
		child.stdout.on('data', (data) => output += data.toString());
		child.stderr.on('data', (data) => output += data.toString());
		child.on('error', reject);
		child.on('close', (code) => resolve({ code, output }));
	});
}

suite('gitlab-ci-local CLI', function (this: Mocha.Suite) {
	this.timeout(30000);

	test('starts the bundled CLI', withTempDir(async (dir) => {
		const { code, output } = await runCli(dir, ['--version']);

		assert.strictEqual(code, 0, output);
		assert.match(output, /\d+\.\d+\.\d+/);
	}));

	// gitlab-ci-local needs Git Bash and rsync on Windows, which the runners lack.
	if (process.platform !== 'win32') {
		test('validates a real repository', withTempDir(async (dir) => {
			initRepo(dir);

			const { code, output } = await runCli(dir, ['--list']);

			assert.strictEqual(code, 0, output);
		}));

		test('runs a job with the shell executor', withTempDir(async (dir) => {
			initRepo(dir);

			const { code, output } = await runCli(dir, ['--force-shell-executor', 'hello']);

			assert.strictEqual(code, 0, output);
			assert.match(output, /hello-from-gitlab-ci-local/);
		}));
	}
});
