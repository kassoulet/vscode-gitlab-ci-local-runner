import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

export class JobsDataProvider implements vscode.TreeDataProvider<Job> {

    private _onDidChangeTreeData: vscode.EventEmitter<Job | undefined | null | void> = new vscode.EventEmitter<Job | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<Job | undefined | null | void> = this._onDidChangeTreeData.event;

    private _jobs: Job[] = []; // To store all jobs
    public jobStatuses: Map<string, string> = new Map(); // To store job statuses

    constructor(private workspaceRoot: string, private extensionPath: string) { }

    refresh(): void {
        this._onDidChangeTreeData.fire();
        // Re-evaluate content and set context key on refresh
        this.getChildren().then(jobs => {
            this.setContextKey('gitlabCiLocal.hasJobs', jobs.length > 0);
        });
    }

    getTreeItem(element: Job): vscode.TreeItem {
        // element.checkboxState = element.checked ? vscode.TreeItemCheckboxState.Checked : vscode.TreeItemCheckboxState.Unchecked;
        return element;
    }

    getChildren(element?: Job): Thenable<Job[]> {
        if (!this.workspaceRoot) {
            vscode.window.showInformationMessage('No jobs in empty workspace');
            this.setContextKey('gitlabCiLocal.hasJobs', false); // Set context key
            return Promise.resolve([]);
        }

        if (element) {
            return Promise.resolve([]);
        } else {
            const gitlabCiPath = path.join(this.workspaceRoot, '.gitlab-ci.yml');
            if (fs.existsSync(gitlabCiPath)) {
                const gitlabCi = yaml.load(fs.readFileSync(gitlabCiPath, 'utf-8')) as Record<string, { script: unknown }>;
                if (gitlabCi && typeof gitlabCi === 'object') {
                    this._jobs = Object.keys(gitlabCi)
                        .filter(key => typeof gitlabCi[key] === 'object' && gitlabCi[key] !== null && 'script' in gitlabCi[key])
                        .map(key => {
                            const status = this.jobStatuses.get(key);
                            return new Job(key, vscode.TreeItemCollapsibleState.None, this.extensionPath, status);
                        });
                    this.setContextKey('gitlabCiLocal.hasJobs', this._jobs.length > 0); // Set context key
                    return Promise.resolve(this._jobs);
                } else {
                    this._jobs = [];
                    this.setContextKey('gitlabCiLocal.hasJobs', false); // Set context key
                    return Promise.resolve([]);
                }
            } else {
                this._jobs = [];
                vscode.window.showInformationMessage('Workspace has no .gitlab-ci.yml file');
                this.setContextKey('gitlabCiLocal.hasJobs', false); // Set context key
                return Promise.resolve([]);
            }
        }
    }

    // Add this new method to JobsDataProvider
    private setContextKey(key: string, value: boolean): void {
        vscode.commands.executeCommand('setContext', key, value);
    }
}

class Job extends vscode.TreeItem {

    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        private readonly extensionPath: string,
        status?: string,
    ) {
        super(label, collapsibleState);
        this.contextValue = 'job';
        this.description = status;
    }

    iconPath = {
        light: vscode.Uri.file(path.join(this.extensionPath, 'resources', 'light', 'job.svg')),
        dark: vscode.Uri.file(path.join(this.extensionPath, 'resources', 'dark', 'job.svg'))
    };
}
