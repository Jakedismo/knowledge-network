import { Version3Client } from 'jira.js';
import {
  IntegrationAdapter,
  IntegrationContext,
  IntegrationCredentials,
  IntegrationError,
} from '../types';

export class JiraAdapter extends IntegrationAdapter {
  private client?: Version3Client;

  async initialize(credentials: IntegrationCredentials): Promise<void> {
    if (!credentials.host || !credentials.email || !credentials.apiToken) {
      throw new IntegrationError('JIRA host, email, and API token are required');
    }

    this.client = new Version3Client({
      host: credentials.host,
      authentication: {
        basic: {
          email: credentials.email,
          apiToken: credentials.apiToken,
        },
      },
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
      throw new IntegrationError('JIRA client not initialized');
    }

    switch (action) {
      case 'test':
        return this.testConnection();
      case 'create_issue':
        return this.createIssue(payload);
      case 'update_issue':
        return this.updateIssue(payload);
      case 'link_issue':
        return this.linkIssue(payload);
      case 'search_issues':
        return this.searchIssues(payload);
      case 'get_projects':
        return this.getProjects(payload);
      case 'get_issue':
        return this.getIssue(payload);
      case 'add_comment':
        return this.addComment(payload);
      case 'transition_issue':
        return this.transitionIssue(payload);
      case 'add_attachment':
        return this.addAttachment(payload);
      default:
        throw new IntegrationError(`Unknown action: ${action}`);
    }
  }

  async validateCredentials(credentials: IntegrationCredentials): Promise<boolean> {
    try {
      await this.initialize(credentials);
      const user = await this.client!.myself.getCurrentUser();
      return !!user.accountId;
    } catch {
      return false;
    }
  }

  private async testConnection(): Promise<any> {
    const user = await this.client!.myself.getCurrentUser();
    const serverInfo = await this.client!.serverInfo.getServerInfo();

    return {
      connected: true,
      user: {
        accountId: user.accountId,
        displayName: user.displayName,
        email: user.emailAddress,
      },
      server: {
        version: serverInfo.version,
        baseUrl: serverInfo.baseUrl,
      },
    };
  }

  private async createIssue(payload: {
    projectKey: string;
    summary: string;
    description?: string;
    issueType: string;
    priority?: string;
    assignee?: string;
    labels?: string[];
    components?: string[];
    customFields?: Record<string, any>;
  }): Promise<any> {
    const issueData: any = {
      fields: {
        project: { key: payload.projectKey },
        summary: payload.summary,
        issuetype: { name: payload.issueType },
      },
    };

    if (payload.description) {
      issueData.fields.description = {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: payload.description,
              },
            ],
          },
        ],
      };
    }

    if (payload.priority) {
      issueData.fields.priority = { name: payload.priority };
    }

    if (payload.assignee) {
      issueData.fields.assignee = { accountId: payload.assignee };
    }

    if (payload.labels) {
      issueData.fields.labels = payload.labels;
    }

    if (payload.components) {
      issueData.fields.components = payload.components.map(c => ({ name: c }));
    }

    if (payload.customFields) {
      Object.assign(issueData.fields, payload.customFields);
    }

    const issue = await this.client!.issues.createIssue(issueData);

    return {
      key: issue.key,
      id: issue.id,
      self: issue.self,
    };
  }

  private async updateIssue(payload: {
    issueKey: string;
    fields: Record<string, any>;
    notifyUsers?: boolean;
  }): Promise<any> {
    await this.client!.issues.editIssue({
      issueIdOrKey: payload.issueKey,
      notifyUsers: payload.notifyUsers ?? true,
      fields: payload.fields,
    });

    return {
      success: true,
      issueKey: payload.issueKey,
    };
  }

  private async linkIssue(payload: {
    issueKey: string;
    url: string;
    title: string;
    icon?: string;
  }): Promise<any> {
    const remoteLink = await this.client!.issueRemoteLinks.createOrUpdateRemoteIssueLink({
      issueIdOrKey: payload.issueKey,
      object: {
        url: payload.url,
        title: payload.title,
        icon: payload.icon ? { url16x16: payload.icon } : undefined,
      },
    });

    return {
      id: remoteLink.id,
      self: remoteLink.self,
    };
  }

  private async searchIssues(payload: {
    jql: string;
    maxResults?: number;
    startAt?: number;
    fields?: string[];
    expand?: string[];
  }): Promise<any> {
    const searchResults = await this.client!.issueSearch.searchForIssuesUsingJql({
      jql: payload.jql,
      maxResults: payload.maxResults || 50,
      startAt: payload.startAt || 0,
      fields: payload.fields,
      expand: payload.expand,
    });

    return {
      total: searchResults.total,
      issues: searchResults.issues?.map(issue => ({
        key: issue.key,
        id: issue.id,
        summary: issue.fields.summary,
        status: issue.fields.status?.name,
        priority: issue.fields.priority?.name,
        assignee: issue.fields.assignee?.displayName,
        created: issue.fields.created,
        updated: issue.fields.updated,
      })) || [],
    };
  }

  private async getProjects(payload: {
    recent?: number;
    expand?: string[];
  }): Promise<any[]> {
    const projects = payload.recent
      ? await this.client!.projects.getRecent(payload.recent)
      : await this.client!.projects.getAllProjects({
          expand: payload.expand,
        });

    return (Array.isArray(projects) ? projects : projects.values || []).map((project: any) => ({
      key: project.key,
      id: project.id,
      name: project.name,
      description: project.description,
      lead: project.lead?.displayName,
      projectTypeKey: project.projectTypeKey,
    }));
  }

  private async getIssue(payload: {
    issueKey: string;
    fields?: string[];
    expand?: string[];
  }): Promise<any> {
    const issue = await this.client!.issues.getIssue({
      issueIdOrKey: payload.issueKey,
      fields: payload.fields,
      expand: payload.expand,
    });

    return {
      key: issue.key,
      id: issue.id,
      summary: issue.fields.summary,
      description: issue.fields.description,
      status: issue.fields.status,
      priority: issue.fields.priority,
      assignee: issue.fields.assignee,
      reporter: issue.fields.reporter,
      created: issue.fields.created,
      updated: issue.fields.updated,
      labels: issue.fields.labels,
      components: issue.fields.components,
    };
  }

  private async addComment(payload: {
    issueKey: string;
    comment: string;
    visibility?: {
      type: 'group' | 'role';
      value: string;
    };
  }): Promise<any> {
    const commentBody: any = {
      body: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: payload.comment,
              },
            ],
          },
        ],
      },
    };

    if (payload.visibility) {
      commentBody.visibility = payload.visibility;
    }

    const comment = await this.client!.issueComments.addComment({
      issueIdOrKey: payload.issueKey,
      ...commentBody,
    });

    return {
      id: comment.id,
      self: comment.self,
      created: comment.created,
    };
  }

  private async transitionIssue(payload: {
    issueKey: string;
    transitionId: string;
    comment?: string;
    fields?: Record<string, any>;
  }): Promise<any> {
    const transitionData: any = {
      transition: {
        id: payload.transitionId,
      },
    };

    if (payload.comment) {
      transitionData.update = {
        comment: [
          {
            add: {
              body: {
                type: 'doc',
                version: 1,
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        type: 'text',
                        text: payload.comment,
                      },
                    ],
                  },
                ],
              },
            },
          },
        ],
      };
    }

    if (payload.fields) {
      transitionData.fields = payload.fields;
    }

    await this.client!.issues.doTransition({
      issueIdOrKey: payload.issueKey,
      ...transitionData,
    });

    return {
      success: true,
      issueKey: payload.issueKey,
      transitionId: payload.transitionId,
    };
  }

  private async addAttachment(payload: {
    issueKey: string;
    file: Buffer;
    filename: string;
  }): Promise<any> {
    const formData = new FormData();
    formData.append('file', new Blob([payload.file]), payload.filename);

    const attachments = await this.client!.issueAttachments.addAttachment({
      issueIdOrKey: payload.issueKey,
      attachment: formData,
    });

    return attachments.map((attachment: any) => ({
      id: attachment.id,
      filename: attachment.filename,
      size: attachment.size,
      mimeType: attachment.mimeType,
      created: attachment.created,
    }));
  }

  // Webhook handling for JIRA events
  async handleWebhook(headers: Record<string, string>, body: any): Promise<any> {
    const event = body.webhookEvent;

    if (!event) {
      throw new IntegrationError('Missing JIRA webhook event');
    }

    switch (event) {
      case 'jira:issue_created':
        return this.handleIssueCreated(body);
      case 'jira:issue_updated':
        return this.handleIssueUpdated(body);
      case 'jira:issue_deleted':
        return this.handleIssueDeleted(body);
      case 'comment_created':
        return this.handleCommentCreated(body);
      default:
        console.log(`Unhandled JIRA event type: ${event}`);
    }

    return { success: true };
  }

  private async handleIssueCreated(event: any): Promise<void> {
    console.log('JIRA issue created:', {
      key: event.issue.key,
      summary: event.issue.fields.summary,
      creator: event.user.displayName,
    });
  }

  private async handleIssueUpdated(event: any): Promise<void> {
    console.log('JIRA issue updated:', {
      key: event.issue.key,
      changelog: event.changelog,
      user: event.user.displayName,
    });
  }

  private async handleIssueDeleted(event: any): Promise<void> {
    console.log('JIRA issue deleted:', {
      key: event.issue.key,
      user: event.user.displayName,
    });
  }

  private async handleCommentCreated(event: any): Promise<void> {
    console.log('JIRA comment created:', {
      issue: event.issue.key,
      comment: event.comment.body,
      author: event.comment.author.displayName,
    });
  }
}