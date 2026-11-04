/**
 * Returns the zero-based line index where a job is defined in a GitLab CI
 * document, or -1 when no top-level key of that name exists.
 *
 * Only keys at column zero match, so mentions inside `variables`, `script`
 * lists or hidden `.job` blocks are ignored. Quoted names and names
 * containing regular-expression characters are handled.
 */
export function findJobLineIndex(fileContents: string, jobName: string): number {
    const escaped = jobName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`^["']?${escaped}["']?\\s*:`);
    return fileContents.split(/\r?\n/).findIndex(line => pattern.test(line));
}
