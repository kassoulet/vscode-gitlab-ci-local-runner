# GitLab CI Local Runner

Run your GitLab CI/CD jobs locally, right from within Visual Studio Code. This extension uses the powerful [`gitlab-ci-local`](https://github.com/firecow/gitlab-ci-local) tool, which is **bundled directly** within the extension—no external installation required!


## Features ✨

* **Zero-Configuration Setup**: Just install the extension and it works. `gitlab-ci-local` is included.
* **Run All Jobs**: Execute the entire CI pipeline sequentially with a single command.
* **Run a Specific Job**: Quickly select and run any individual job from your `.gitlab-ci.yml` file.
* **Validate CI Syntax**: Instantly check your `.gitlab-ci.yml` for syntax errors.
* **Integrated Terminal**: All output is streamed to a dedicated VS Code terminal for a native experience.
* **Context Menu**: Right-click your `.gitlab-ci.yml` file for quick access to all commands.

## How to Use

1.  Make sure you have a `.gitlab-ci.yml` file in the root of your project workspace.
2.  **Using the Command Palette (`Ctrl+Shift+P`)**:
    * `GitLab CI: Run all local jobs`
    * `GitLab CI: Run a specific local job...` (This will show a dropdown of available jobs)
    * `GitLab CI: Validate .gitlab-ci.yml`
3.  **Using the Editor Context Menu**:
    * Right-click on your `.gitlab-ci.yml` file in the editor or file explorer to access the same commands.


## Requirements

None! Just install the extension.


## Extension Settings

This extension currently has no configurable settings.

---

Enjoy running your CI pipelines locally! 🚀