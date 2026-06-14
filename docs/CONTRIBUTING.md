# Contributing to ObservabilityOS

Thank you for your interest in contributing to ObservabilityOS! We welcome community contributions to help improve our AI-native DevOps intelligence tools.

This guide details code standards, pull request workflows, and commit conventions.

---

## 🤝 Code of Conduct

We aim to foster an open, welcoming, and developer-friendly environment. Please treat all contributors and maintainers with respect.

---

## 🏗️ Git Branching & Workflow

We follow standard feature branching guidelines:

1. **Fork the Repository**: Create your own fork of the project.
2. **Clone the Fork**: Clone it locally.
3. **Branch Creation**: Create a branch off the `main` branch.
   * `feat/your-feature`: New capabilities or components.
   * `fix/bug-fix`: Code modifications correcting errors.
   * `docs/update-docs`: Documentation or markdown updates.
   * `refactor/cleanup`: Code cleanups, lint fixes, or design adjustments.
4. **Develop & Verify**: Verify that all typechecks, builds, and lint rules pass.
5. **Open a PR**: Push your branch to GitHub and open a Pull Request to the upstream `main` branch.

---

## 📝 Commit Message Conventions

We use **Conventional Commits** formatting to standardize our changelogs and version tags. Commit messages must be structured as follows:

```text
<type>(<scope>): <short description>

[optional body]
```

### Allowed Types:
* `feat`: A new feature (e.g. `feat(sdk): add auto-retry buffer flush`).
* `fix`: A bug fix (e.g. `fix(ingest): correct rate-limiting window offset`).
* `docs`: Documentation updates (e.g. `docs(api): document search endpoint payloads`).
* `style`: Styling changes, spacing, linting format fixes (no logic mutations).
* `refactor`: Code restructuring without modifying public APIs (e.g. `refactor(db): deduplicate schema models`).
* `test`: Adding or correcting unit/integration tests (e.g. `test(cache): add redis cache invalidation mock`).
* `chore`: Maintenance chores, dependencies, configuration adjustments (e.g. `chore(deps): upgrade mongoose to v8`).

---

## 🎨 Coding Standards

### TypeScript
* Enforce strict mode checks (`strict: true` in `tsconfig.json`).
* Avoid using `any` types wherever possible. Explicitly define interfaces or use custom types.
* Prefer using utility wrappers and functional type assertions rather than force-casting.

### Linting & Formatting
We enforce strict style analysis through ESLint. Check code formatting locally before staging files:

```bash
# Analyze styles across the web workspace
yarn lint

# Automatically resolve formatting and canonical class order warnings
yarn lint:fix
```

### Component Guidelines
* Use Radix/shadcn UI primitive components (Level 1 controls like Button, Card, Switch, Input, DropdownMenu) located in `apps/web/src/components/ui/` to ensure visual cohesion.
* Do not introduce arbitrary inline styles or ad-hoc custom control modules unless highly specialized logic is required.
* Ensure all interactive components include unique, descriptive HTML `id` attributes to support automated browser testing and accessibility.

---

## 🔍 Pull Request & Code Review Process

To ensure PRs are reviewed and merged quickly:

1. **Write a Description**: Explain *what* changes were made, *why* they were made, and *how* they were verified.
2. **Link Issues**: Reference any related GitHub issue numbers.
3. **Maintain Lint Compliance**: PR pipelines will run lint checks and build tasks. If the pipeline fails, address the warnings before requesting a review.
4. **Review Cycle**: At least one core maintainer must review and approve the PR before it is merged. Address feedback by pushing additional commits directly to your feature branch.
