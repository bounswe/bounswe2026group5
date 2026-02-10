# Project Standards & Workflow

## 1. Branching Strategy

We use a **Feature Branch Workflow** to keep the main branch stable. Don't push directly to `main` – use a standard naming convention so everyone knows what a branch contains at a glance.

### Branch Naming Convention

- **`main`**: Production-ready code only. No direct commits.
- **`dev`**: The integration branch where features are combined and tested.
- **`feat/feature-name`**: For new features (e.g., `feat/user-login`, `feat/login-page`)
- **`fix/bug-name`**: For bug fixes (e.g., `fix/header-overlap`, `fix/header-alignment`)
- **`docs/update-name`**: For documentation updates (e.g., `docs/update-readme`)
- **`refactor/description`**: For code refactoring (e.g., `refactor/cleanup-logic`)

## 2. Pull Request (PR) Process

All code must enter `dev` via a Pull Request. No direct commits to `main` or `dev`.

### Workflow Steps

1. **Sync Local**: `git checkout dev && git pull origin dev`
2. **Create Branch**: `git checkout -b feat/your-task-name`
3. **Commit Often**: Use descriptive commit messages (see convention below)
4. **Open PR**: Target the `dev` branch, not `main`
5. **Review**: At least one teammate must approve the PR before merging
6. **Merge**: After approval, merge the PR into `dev`

## 3. Commit Message Convention

We follow the **Conventional Commits** standard to keep our history readable.

### Format

```
<type>: <description>
```

### Types

- **`feat:`** New feature for the user (e.g., `feat: add search bar to homepage`)
- **`fix:`** Bug fix (e.g., `fix: resolve crash on logout`)
- **`docs:`** Changes to documentation (e.g., `docs: update installation instructions`)
- **`style:`** Formatting, missing semi-colons, etc; no production code change
- **`refactor:`** Refactoring production code (e.g., `refactor: rename variable for clarity`)

## 4. Definition of Done (DoD)

A task is only considered "Done" when:

- Code is pushed to a feature branch
- Pull Request is opened and linked to the relevant Issue
- Code has been reviewed and approved by a teammate
- The branch is successfully merged into `dev`

## 5. Coding Standards

To avoid arguments about tabs vs. spaces or semicolon usage, we use linters and formatters:

- **Linters**: ESLint for JavaScript, Ruff for Python
- **Formatters**: Prettier

This ensures that no matter who writes the code, it looks like it was written by one person and prevents "noise" in PRs where the only changes are whitespace formatting.

## 6. Code Quality

Just for now, install SonarQube on your IDE.
