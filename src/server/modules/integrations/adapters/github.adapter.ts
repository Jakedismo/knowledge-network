import { Octokit } from '@octokit/rest';
import {
  IntegrationAdapter,
  IntegrationContext,
  IntegrationCredentials,
  IntegrationError,
} from '../types';

export class GitHubAdapter extends IntegrationAdapter {
  private client?: Octokit;

  async initialize(credentials: IntegrationCredentials): Promise<void> {
    if (!credentials.accessToken) {
      throw new IntegrationError('GitHub access token is required');
    }

    this.client = new Octokit({
      auth: credentials.accessToken,
    });
  }

  async execute(
    action: string,
    context: IntegrationContext,
    payload?: any
  ): Promise<any> {
    if (!context.credentials) {
      throw new IntegrationError('No credentials provided');
    }

    await this.initialize(context.credentials);

    if (!this.client) {
      throw new IntegrationError('GitHub client not initialized');
    }

    switch (action) {
      case 'test':
        return this.testConnection();
      case 'create_issue':
        return this.createIssue(payload);
      case 'update_issue':
        return this.updateIssue(payload);
      case 'create_pr':
        return this.createPullRequest(payload);
      case 'link_commit':
        return this.linkCommit(payload);
      case 'search_code':
        return this.searchCode(payload);
      case 'get_repos':
        return this.getRepositories(payload);
      case 'get_issues':
        return this.getIssues(payload);
      case 'create_comment':
        return this.createComment(payload);
      case 'create_gist':
        return this.createGist(payload);
      default:
        throw new IntegrationError(`Unknown action: ${action}`);
    }
  }

  async validateCredentials(credentials: IntegrationCredentials): Promise<boolean> {
    try {
      await this.initialize(credentials);
      const { data } = await this.client!.users.getAuthenticated();
      return !!data.id;
    } catch {
      return false;
    }
  }

  private async testConnection(): Promise<any> {
    const { data: user } = await this.client!.users.getAuthenticated();
    return {
      connected: true,
      user: {
        login: user.login,
        name: user.name,
        email: user.email,
        id: user.id,
      },
    };
  }

  private async createIssue(payload: {
    owner: string;
    repo: string;
    title: string;
    body?: string;
    labels?: string[];
    assignees?: string[];
    milestone?: number;
  }): Promise<any> {
    const { data: issue } = await this.client!.issues.create({
      owner: payload.owner,
      repo: payload.repo,
      title: payload.title,
      body: payload.body,
      labels: payload.labels,
      assignees: payload.assignees,
      milestone: payload.milestone,
    });

    return {
      number: issue.number,
      url: issue.html_url,
      id: issue.id,
    };
  }

  private async updateIssue(payload: {
    owner: string;
    repo: string;
    issue_number: number;
    title?: string;
    body?: string;
    state?: 'open' | 'closed';
    labels?: string[];
  }): Promise<any> {
    const { data: issue } = await this.client!.issues.update({
      owner: payload.owner,
      repo: payload.repo,
      issue_number: payload.issue_number,
      title: payload.title,
      body: payload.body,
      state: payload.state,
      labels: payload.labels,
    });

    return {
      number: issue.number,
      url: issue.html_url,
      state: issue.state,
    };
  }

  private async createPullRequest(payload: {
    owner: string;
    repo: string;
    title: string;
    body?: string;
    head: string;
    base: string;
    draft?: boolean;
  }): Promise<any> {
    const { data: pr } = await this.client!.pulls.create({
      owner: payload.owner,
      repo: payload.repo,
      title: payload.title,
      body: payload.body,
      head: payload.head,
      base: payload.base,
      draft: payload.draft,
    });

    return {
      number: pr.number,
      url: pr.html_url,
      id: pr.id,
      state: pr.state,
    };
  }

  private async linkCommit(payload: {
    owner: string;
    repo: string;
    sha: string;
    knowledgeId: string;
    knowledgeUrl: string;
  }): Promise<void> {
    await this.client!.repos.createCommitComment({
      owner: payload.owner,
      repo: payload.repo,
      commit_sha: payload.sha,
      body: `📚 Referenced in Knowledge: [${payload.knowledgeId}](${payload.knowledgeUrl})`,
    });
  }

  private async searchCode(payload: {
    query: string;
    repo?: string;
    user?: string;
    org?: string;
    language?: string;
    per_page?: number;
  }): Promise<any[]> {
    let searchQuery = payload.query;

    if (payload.repo) {
      searchQuery += ` repo:${payload.repo}`;
    }
    if (payload.user) {
      searchQuery += ` user:${payload.user}`;
    }
    if (payload.org) {
      searchQuery += ` org:${payload.org}`;
    }
    if (payload.language) {
      searchQuery += ` language:${payload.language}`;
    }

    const { data: results } = await this.client!.search.code({
      q: searchQuery,
      per_page: payload.per_page || 10,
    });

    return results.items.map(item => ({
      name: item.name,
      path: item.path,
      repository: item.repository.full_name,
      url: item.html_url,
      sha: item.sha,
    }));
  }

  private async getRepositories(payload: {
    type?: 'all' | 'owner' | 'public' | 'private' | 'member';
    sort?: 'created' | 'updated' | 'pushed' | 'full_name';
    per_page?: number;
  }): Promise<any[]> {
    const { data: repos } = await this.client!.repos.listForAuthenticatedUser({
      type: payload.type || 'all',
      sort: payload.sort || 'updated',
      per_page: payload.per_page || 30,
    });

    return repos.map(repo => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      url: repo.html_url,
      private: repo.private,
      defaultBranch: repo.default_branch,
    }));
  }

  private async getIssues(payload: {
    owner: string;
    repo: string;
    state?: 'open' | 'closed' | 'all';
    labels?: string;
    assignee?: string;
    per_page?: number;
  }): Promise<any[]> {
    const { data: issues } = await this.client!.issues.listForRepo({
      owner: payload.owner,
      repo: payload.repo,
      state: payload.state || 'open',
      labels: payload.labels,
      assignee: payload.assignee,
      per_page: payload.per_page || 30,
    });

    return issues.map(issue => ({
      number: issue.number,
      title: issue.title,
      state: issue.state,
      url: issue.html_url,
      labels: issue.labels.map((l: any) => l.name),
      assignees: issue.assignees?.map((a: any) => a.login) || [],
    }));
  }

  private async createComment(payload: {
    owner: string;
    repo: string;
    issue_number: number;
    body: string;
  }): Promise<any> {
    const { data: comment } = await this.client!.issues.createComment({
      owner: payload.owner,
      repo: payload.repo,
      issue_number: payload.issue_number,
      body: payload.body,
    });

    return {
      id: comment.id,
      url: comment.html_url,
      body: comment.body,
    };
  }

  private async createGist(payload: {
    description?: string;
    files: Record<string, { content: string }>;
    public?: boolean;
  }): Promise<any> {
    const { data: gist } = await this.client!.gists.create({
      description: payload.description,
      files: payload.files,
      public: payload.public || false,
    });

    return {
      id: gist.id,
      url: gist.html_url,
      files: Object.keys(gist.files || {}),
    };
  }

  // Webhook handling for GitHub events
  async handleWebhook(headers: Record<string, string>, body: any): Promise<any> {
    const event = headers['x-github-event'];

    if (!event) {
      throw new IntegrationError('Missing GitHub event header');
    }

    // TODO: Validate webhook signature using headers['x-hub-signature-256']

    switch (event) {
      case 'push':
        return this.handlePushEvent(body);
      case 'pull_request':
        return this.handlePullRequestEvent(body);
      case 'issues':
        return this.handleIssueEvent(body);
      case 'issue_comment':
        return this.handleIssueCommentEvent(body);
      default:
        console.log(`Unhandled GitHub event type: ${event}`);
    }

    return { success: true };
  }

  private async handlePushEvent(event: any): Promise<void> {
    console.log('GitHub push event:', {
      repository: event.repository.full_name,
      commits: event.commits.length,
      pusher: event.pusher.name,
    });
  }

  private async handlePullRequestEvent(event: any): Promise<void> {
    console.log('GitHub pull request event:', {
      action: event.action,
      number: event.pull_request.number,
      title: event.pull_request.title,
    });
  }

  private async handleIssueEvent(event: any): Promise<void> {
    console.log('GitHub issue event:', {
      action: event.action,
      number: event.issue.number,
      title: event.issue.title,
    });
  }

  private async handleIssueCommentEvent(event: any): Promise<void> {
    console.log('GitHub issue comment event:', {
      action: event.action,
      issue: event.issue.number,
      comment: event.comment.body.substring(0, 100),
    });
  }
}