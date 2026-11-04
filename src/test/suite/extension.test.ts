import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { getJobNames } from '../../extension';
import { findJobLineIndex } from '../../ciFile';
import { JobsDataProvider } from '../../jobsTree';
import { extensionPath, withTempDir, writeCi } from './helpers';

const sampleCi = `stages: [build, test]
image: node:20
variables:
  FOO: bar
before_script:
  - echo hi
.hidden_job:
  script: echo hidden
build:
  script: npm run build
test:
  script: npm test
`;

suite('getJobNames', () => {
	test('returns job names, skipping reserved keywords and hidden jobs', withTempDir((dir) => {
		assert.deepStrictEqual(getJobNames(writeCi(dir, sampleCi)), ['build', 'test']);
	}));

	test('returns no jobs for an empty file', withTempDir((dir) => {
		assert.deepStrictEqual(getJobNames(writeCi(dir, '')), []);
	}));

	test('throws on malformed YAML', withTempDir((dir) => {
		assert.throws(() => getJobNames(writeCi(dir, 'build: [unclosed')));
	}));
});

suite('JobsDataProvider', () => {
	test('lists only entries that are objects with a script', withTempDir(async (dir) => {
		writeCi(dir, `${sampleCi}not_a_job: just a string\n`);
		const jobs = await new JobsDataProvider(dir, extensionPath).getChildren();

		assert.deepStrictEqual(jobs.map(job => job.label), ['build', 'test']);
		assert.ok(jobs.every(job => job.contextValue === 'job'));
		assert.ok(jobs.every(job => job.collapsibleState === vscode.TreeItemCollapsibleState.None));
	}));

	test('lists jobs from .gitlab-ci.yaml as well', withTempDir(async (dir) => {
		writeCi(dir, sampleCi, '.gitlab-ci.yaml');
		const jobs = await new JobsDataProvider(dir, extensionPath).getChildren();

		assert.deepStrictEqual(jobs.map(job => job.label), ['build', 'test']);
	}));

	test('lists jobs that inherit script via extends and trigger jobs', withTempDir(async (dir) => {
		writeCi(dir, `.template:
  script: echo template
inherited:
  extends: .template
triggered:
  trigger:
    include: child.yml
`);
		const jobs = await new JobsDataProvider(dir, extensionPath).getChildren();

		assert.deepStrictEqual(jobs.map(job => job.label), ['inherited', 'triggered']);
	}));

	test('shows the stored status as the job description', withTempDir(async (dir) => {
		writeCi(dir, sampleCi);
		const provider = new JobsDataProvider(dir, extensionPath);
		provider.jobStatuses.set('build', '(success)');

		const jobs = await provider.getChildren();
		const build = jobs.find(job => job.label === 'build');

		assert.strictEqual(build?.description, '(success)');
	}));

	test('returns no jobs when the workspace has no CI file', withTempDir(async (dir) => {
		const jobs = await new JobsDataProvider(dir, extensionPath).getChildren();

		assert.deepStrictEqual(jobs, []);
	}));

	test('returns no children for a job element', withTempDir(async (dir) => {
		writeCi(dir, sampleCi);
		const provider = new JobsDataProvider(dir, extensionPath);
		const [job] = await provider.getChildren();

		assert.deepStrictEqual(await provider.getChildren(job), []);
	}));
});

suite('Bundled CLI', () => {
	test('has the entry point used by the extension', () => {
		assert.ok(fs.existsSync(path.join(extensionPath, 'node_modules', 'gitlab-ci-local', 'dist', 'index.js')));
	});
});

suite('findJobLineIndex', () => {
	test('finds a job key at the top level', () => {
		assert.strictEqual(findJobLineIndex(sampleCi, 'build'), 8);
		assert.strictEqual(findJobLineIndex(sampleCi, 'test'), 10);
	});

	test('returns -1 when the job is not defined', () => {
		assert.strictEqual(findJobLineIndex(sampleCi, 'missing'), -1);
	});

	test('ignores mentions outside column zero', () => {
		const ci = `variables:\n  build: nope\ndeploy:\n  script: echo deploy\n`;

		assert.strictEqual(findJobLineIndex(ci, 'build'), -1);
		assert.strictEqual(findJobLineIndex(ci, 'deploy'), 2);
	});

	test('handles quoted names and regular-expression characters', () => {
		const ci = `"my job":\n  script: echo quoted\ndeploy.prod:\n  script: echo dotted\ndeployXprod:\n  script: echo other\n`;

		assert.strictEqual(findJobLineIndex(ci, 'my job'), 0);
		assert.strictEqual(findJobLineIndex(ci, 'deploy.prod'), 2);
	});

	test('works with CRLF line endings', () => {
		assert.strictEqual(findJobLineIndex('build:\r\n  script: npm run build\r\n', 'build'), 0);
	});
});
