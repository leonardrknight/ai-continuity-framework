/**
 * GitHub API action helpers.
 * Used by later PRs when Guardian responds to events.
 * PR 3 just defines the interface; actual Octokit usage comes when
 * we have a GitHub App configured.
 */

export interface GitHubActionsClient {
  postComment(owner: string, repo: string, issueNumber: number, body: string): Promise<void>;
  addLabels(owner: string, repo: string, issueNumber: number, labels: string[]): Promise<void>;
}

/**
 * Create a no-op actions client for testing or when no GitHub App is configured.
 */
export function createNoopActionsClient(): GitHubActionsClient {
  return {
    async postComment() {
      // No-op: will be implemented when GitHub App is installed
    },
    async addLabels() {
      // No-op: will be implemented when GitHub App is installed
    },
  };
}
