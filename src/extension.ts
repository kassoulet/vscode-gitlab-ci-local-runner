import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { JobsDataProvider } from './jobsTree';
import { spawn } from 'child_process';

let jobsDataProvider: JobsDataProvider | undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log('GitLab CI Local Runner extension is now active.');

    const rootPath = (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
        ? vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;

    if (rootPath) {
        jobsDataProvider = new JobsDataProvider(rootPath, context.extensionPath);
        vscode.window.registerTreeDataProvider('gitlab-ci-local-jobs', jobsDataProvider);
        vscode.commands.registerCommand('gitlab-ci-local.refreshJobs', () => jobsDataProvider!.refresh());
    } else {
        console.log('No rootPath found, not registering JobsDataProvider.');
        vscode.window.showWarningMessage('No project folder is open. Some features of the GitLab CI Local Runner extension will be disabled.');
    }

    context.subscriptions.push(
        vscode.commands.registerCommand('gitlab-ci-local.runAll', () => runAllJobs(context)),
        vscode.commands.registerCommand('gitlab-ci-local.runJob', (jobName) => runSpecificJob(context, jobName)),
        vscode.commands.registerCommand('gitlab-ci-local.validateCIFile', () => validateCiFile(context)),
        vscode.commands.registerCommand('gitlab-ci-local.runJobFromTree', (job) => runSpecificJob(context, job.label))
    );
}

export function deactivate() { }

async function runAllJobs(context: vscode.ExtensionContext) {
    const ciFilePath = await findCiFile();
    if (!ciFilePath) {
        return;
    }
    const workspaceRoot = path.dirname(ciFilePath);
    executeCommand(context, [], workspaceRoot);
}

async function validateCiFile(context: vscode.ExtensionContext) {
    const ciFilePath = await findCiFile();
    if (!ciFilePath) {
        return;
    }
    const workspaceRoot = path.dirname(ciFilePath);
    executeCommand(context, ['--validate'], workspaceRoot);
}

async function runSpecificJob(context: vscode.ExtensionContext, jobName?: string) {
    const ciFilePath = await findCiFile();
    if (!ciFilePath) {
        return;
    }

    try {
        if (jobName) {
            const workspaceRoot = path.dirname(ciFilePath);
            executeCommand(context, [jobName], workspaceRoot, jobName);
            return;
        }

        const jobNames = getJobNames(ciFilePath);
        if (jobNames.length === 0) {
            vscode.window.showWarningMessage('No runnable jobs found in .gitlab-ci.yml.');
            return;
        }

        const selectedJob = await vscode.window.showQuickPick(jobNames, {
            placeHolder: 'Select a GitLab CI job to run locally',
            canPickMany: false,
        });

        if (selectedJob) {
            const workspaceRoot = path.dirname(ciFilePath);
            executeCommand(context, [selectedJob], workspaceRoot, selectedJob);
        }
    } catch (error: unknown) {
        if (error instanceof Error) {
            vscode.window.showErrorMessage(`Failed to parse .gitlab-ci.yml: ${error.message}`);
        } else {
            vscode.window.showErrorMessage(`Failed to parse .gitlab-ci.yml: An unknown error occurred`);
        }
    }
}

function executeCommand(context: vscode.ExtensionContext, args: string[], cwd: string, jobName?: string) {
    const executablePath = path.join(context.extensionPath, 'node_modules', '.bin', 'gitlab-ci-local');

    const writeEmitter = new vscode.EventEmitter<string>();
    const pty: vscode.Pseudoterminal = {
        onDidWrite: writeEmitter.event,
        open: () => {
            const termWriter = (text: string) => {
                writeEmitter.fire(text.replace(/\n/g, '\r\n'));
            };

            termWriter('Running command: ' + 'gitlab-ci-local' + ' ' + args.join(' ') + '\n\n');
            if (jobName && jobsDataProvider) {
                jobsDataProvider.jobStatuses.set(jobName, '(...)');
                jobsDataProvider.refresh();
            }

            const child = spawn(executablePath, args, { cwd });
            child.stdout.on('data', (data) => {
                termWriter(data.toString());
            });
            child.stderr.on('data', (data) => {
                termWriter(data.toString());
            });
            child.on('close', (code) => {
                const status = code === 0 ? '(success)' : '(failed)';
                if (jobName && jobsDataProvider) {
                    jobsDataProvider.jobStatuses.set(jobName, status);
                    jobsDataProvider.refresh();
                }
                termWriter(`\nCommand finished with exit code ${code}.`);
            });
        },
        close: () => { },
    };

    const terminal = vscode.window.createTerminal({ name: `GitLab CI Local Jobs`, pty });
    terminal.show();
}

async function findCiFile(): Promise<string | undefined> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('Please open a project folder to use this extension.');
        return undefined;
    }

    for (const folder of workspaceFolders) {
        const ciPath = path.join(folder.uri.fsPath, '.gitlab-ci.yml');
        if (fs.existsSync(ciPath)) {
            return ciPath;
        }
        const ciPathYaml = path.join(folder.uri.fsPath, '.gitlab-ci.yaml');
        if (fs.existsSync(ciPathYaml)) {
            return ciPathYaml;
        }
    }

    vscode.window.showErrorMessage('No .gitlab-ci.yml file found in the root of your workspace.');
    return undefined;
}

function getJobNames(filePath: string): string[] {
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const data = yaml.load(fileContents) as Record<string, unknown>;

    if (!data || typeof data !== 'object') {
        return [];
    }

    const reservedKeywords = [
        'default', 'image', 'services', 'stages', 'types', 'before_script',
        'after_script', 'variables', 'cache', 'include', 'workflow', 'pages'
    ];

    return Object.keys(data).filter(key =>
        !key.startsWith('.') && !reservedKeywords.includes(key)
    );
}