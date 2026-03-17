/**
 * GitHub API action helpers.
 * Used by Guardian to respond to events (post comments, add labels).
 */

import { Octokit } from '@octokit/rest';

export interface GitHubActionsClient {
  postComment(owner: string, repo: string, issueNumber: number, body: string): Promise<void>;
  addLabels(owner: string, repo: string, issueNumber: number, labels: string[]): Promise<void>;
}

/**
 * Create a live GitHub Actions client using Octokit.
 * Authenticates via the provided token (typically a GitHub App installation token).
 */
export function createGitHubActionsClient(token: string): GitHubActionsClient {
  const octokit = new Octokit({ auth: token });

  return {
    async postComment(owner, repo, issueNumber, body) {
      await octokit.issues.createComment({
        owner,
        repo,
        issue_number: issueNumber,
        body,
      });
    },

    async addLabels(owner, repo, issueNumber, labels) {
      await octokit.issues.addLabels({
        owner,
        repo,
        issue_number: issueNumber,
        labels,
      });
    },
  };
}

/**
 * Create a no-op actions client for testing or when no GitHub App is configured.
 */
export function createNoopActionsClient(): GitHubActionsClient {
  return {
    async postComment() {
      // No-op: used in tests or when GitHub App is not installed
    },
    async addLabels() {
      // No-op: used in tests or when GitHub App is not installed
    },
  };
}
