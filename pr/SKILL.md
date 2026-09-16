---
name: pr
description: "Review committed changes and publish a maintainer-ready draft PR in the current branch's writable remote repository. Use when the user invokes \"$pr\" or asks to draft, create, or open a PR."
---

## Preflight

1. Treat the current branch's Git remote as the sole publication target. Never infer a repository from GitHub CLI context, follow a parent/upstream repository, create or synchronize a fork, or publish anywhere else. Require authenticated write access; otherwise stop and ask the user to run from a branch whose remote is their writable fork or repository.
2. Run the bundled `bash scripts/pr-preflight` from the target worktree before review. Publication runs its own preflight; do not run an extra one before publishing. Never review or publish while blocked.
3. Inspect its prospective commits and complete diff for task scope.
4. If the branch is default or spent, rebuild from the reported base with only intended commits, then rerun preflight.

## Review

1. Use the preflight base and head; verify worktree HEAD before each review.
2. Review the complete `base...head` diff. Fix actionable findings within the authorized scope, commit the fixes, rerun affected checks, and continue through publication. Ask when resolution requires a material scope decision; report unresolved blockers without publishing.
   Run repository checks with CI-equivalent options; reuse passing results for the same revision when applicable. Expected visual changes need scoped assertions, not blanket bypasses.
3. For UI changes, follow [UI evidence](references/ui-evidence.md) before publication.

## Package

- Use the repository PR template exactly when present.
- When repository conventions are unclear, consult recently merged PRs or base-branch Git history for vocabulary, scope, and level of detail.
- Title: `<type>(<scope>): <plain-language outcome>`. Name what changes and why it matters to a reviewer unfamiliar with the task. Prefer familiar repository terms; avoid internal workflow jargon and lists of implementation steps. Use the narrowest Conventional Commits type, reserve `style` for formatting-only changes, and omit an unhelpful scope.
- Read the title without the description: can a reviewer tell what this PR accomplishes? If not, rewrite it. When scope changes, update the title to describe the complete final change.
  Example: replace “carry authorized review fixes through draft publication” with “simplify the PR workflow and remove redundant checks”.
- Add issue-closing syntax when the change resolves an issue.
- Do not invent template sections or include generic command output.
- Without a repository template, use `## Purpose`, `## Solution`, and `## Verification` for substantive changes. Purpose states the problem or user need. Solution explains the approach and relevant trade-offs; add implementation bullets only when they help reviewers. Verification records the evidence that the change works. For a trivial change, one short paragraph may replace these sections.

## Publish

The publishing script confirms the base and worktree HEAD still match the reviewed revisions. If either changed, repeat the affected review, checks, and UI captures before publication.

For an existing draft, snapshot with `bash scripts/pr-publish --snapshot OWNER/REPO NUMBER > /tmp/pr-body.old` and preserve its content. Publish with `bash scripts/pr-publish REVIEWED_BASE REVIEWED_HEAD TITLE [/tmp/pr-body.old] < /tmp/pr-body.md`; it blocks stale reviews, unsafe body replacement, invalid titles or media, and mismatched draft metadata or commits.

After pushing, wait for required checks on that head and resolve failures caused by the change within the authorized scope. Apply the same review and verification requirements to any fixes.

Only create or update drafts unless the user explicitly requests a merge. For an explicit merge request, mark the reviewed PR ready if necessary and merge it; otherwise never mark ready or merge. Never request reviewers, enable auto-merge, or post GitHub review activity.

Finish when the draft contains the reviewed commits, an accurate description, required UI evidence, and passing required checks (or the explicitly requested merge is complete). Return the PR URL and verification status. If blocked, report the blocker and what remains without claiming completion.
