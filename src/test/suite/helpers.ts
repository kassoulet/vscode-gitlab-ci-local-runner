import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export const extensionPath = path.resolve(__dirname, '../../..');

export function withTempDir(run: (dir: string) => void | Promise<void>): () => Promise<void> {
	return async () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitlab-ci-local-'));
		try {
			await run(dir);
		} finally {
			fs.rmSync(dir, { recursive: true, force: true });
		}
	};
}

export function writeCi(dir: string, content: string, fileName = '.gitlab-ci.yml'): string {
	const filePath = path.join(dir, fileName);
	fs.writeFileSync(filePath, content);
	return filePath;
}
