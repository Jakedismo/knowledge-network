import { Client } from '@microsoft/microsoft-graph-client';
import {
  IntegrationAdapter,
  IntegrationContext,
  IntegrationCredentials,
  IntegrationError,
} from '../types';

export class TeamsAdapter extends IntegrationAdapter {
  private client?: Client;

  async initialize(credentials: IntegrationCredentials): Promise<void> {
    if (!credentials.accessToken) {
      throw new IntegrationError('Microsoft Teams access token is required');
    }

    this.client = Client.init({
      authProvider: (done) => {
        done(null, credentials.accessToken!);
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
      throw new IntegrationError('Teams client not initialized');
    }

    switch (action) {
      case 'test':
        return this.testConnection();
      case 'send_notification':
        return this.sendNotification(payload);
      case 'create_team':
        return this.createTeam(payload);
      case 'create_channel':
        return this.createChannel(payload);
      case 'post_message':
        return this.postMessage(payload);
      case 'add_member':
        return this.addMember(payload);
      case 'get_teams':
        return this.getTeams(payload);
      case 'get_channels':
        return this.getChannels(payload);
      case 'upload_file':
        return this.uploadFile(payload);
      default:
        throw new IntegrationError(`Unknown action: ${action}`);
    }
  }

  async validateCredentials(credentials: IntegrationCredentials): Promise<boolean> {
    try {
      await this.initialize(credentials);
      const user = await this.client!.api('/me').get();
      return !!user.id;
    } catch {
      return false;
    }
  }

  private async testConnection(): Promise<any> {
    const user = await this.client!.api('/me').get();
    return {
      connected: true,
      user: {
        id: user.id,
        displayName: user.displayName,
        mail: user.mail,
      },
    };
  }

  private async sendNotification(payload: {
    teamId: string;
    channelId: string;
    message: string;
    importance?: 'normal' | 'high' | 'urgent';
  }): Promise<void> {
    await this.client!
      .api(`/teams/${payload.teamId}/channels/${payload.channelId}/messages`)
      .post({
        body: {
          content: payload.message,
          importance: payload.importance || 'normal',
        },
      });
  }

  private async createTeam(payload: {
    displayName: string;
    description: string;
    visibility?: 'private' | 'public';
  }): Promise<string> {
    const team = await this.client!.api('/teams').post({
      'template@odata.bind': "https://graph.microsoft.com/v1.0/teamsTemplates('standard')",
      displayName: payload.displayName,
      description: payload.description,
      visibility: payload.visibility || 'private',
    });

    // Wait for team creation to complete
    await this.delay(5000);

    return team.id;
  }

  private async createChannel(payload: {
    teamId: string;
    displayName: string;
    description?: string;
    membershipType?: 'standard' | 'private';
  }): Promise<string> {
    const channel = await this.client!
      .api(`/teams/${payload.teamId}/channels`)
      .post({
        displayName: payload.displayName,
        description: payload.description,
        membershipType: payload.membershipType || 'standard',
      });

    return channel.id;
  }

  private async postMessage(payload: {
    teamId: string;
    channelId: string;
    content: string;
    importance?: 'normal' | 'high' | 'urgent';
    replyToId?: string;
  }): Promise<any> {
    const endpoint = payload.replyToId
      ? `/teams/${payload.teamId}/channels/${payload.channelId}/messages/${payload.replyToId}/replies`
      : `/teams/${payload.teamId}/channels/${payload.channelId}/messages`;

    const message = await this.client!.api(endpoint).post({
      body: {
        content: payload.content,
        importance: payload.importance || 'normal',
      },
    });

    return {
      messageId: message.id,
      webUrl: message.webUrl,
    };
  }

  private async addMember(payload: {
    teamId: string;
    userId: string;
    roles?: string[];
  }): Promise<void> {
    await this.client!.api(`/teams/${payload.teamId}/members`).post({
      '@odata.type': '#microsoft.graph.aadUserConversationMember',
      userId: payload.userId,
      roles: payload.roles || [],
    });
  }

  private async getTeams(payload: {
    filter?: string;
    top?: number;
  }): Promise<any[]> {
    let query = this.client!.api('/me/joinedTeams');

    if (payload.filter) {
      query = query.filter(payload.filter);
    }

    if (payload.top) {
      query = query.top(payload.top);
    }

    const result = await query.get();
    return result.value || [];
  }

  private async getChannels(payload: {
    teamId: string;
    filter?: string;
  }): Promise<any[]> {
    let query = this.client!.api(`/teams/${payload.teamId}/channels`);

    if (payload.filter) {
      query = query.filter(payload.filter);
    }

    const result = await query.get();
    return result.value || [];
  }

  private async uploadFile(payload: {
    teamId: string;
    channelId: string;
    fileName: string;
    fileContent: Buffer;
    contentType?: string;
  }): Promise<any> {
    // Get the channel's files folder
    const folder = await this.client!
      .api(`/teams/${payload.teamId}/channels/${payload.channelId}/filesFolder`)
      .get();

    // Upload the file
    const uploadUrl = `/drives/${folder.parentReference.driveId}/items/${folder.id}:/${payload.fileName}:/content`;

    const file = await this.client!
      .api(uploadUrl)
      .putStream(payload.fileContent);

    return {
      fileId: file.id,
      webUrl: file.webUrl,
      name: file.name,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Webhook handling for Teams events
  async handleWebhook(headers: Record<string, string>, body: any): Promise<any> {
    // Validate webhook signature
    if (!this.validateWebhookSignature(headers, body)) {
      throw new IntegrationError('Invalid webhook signature');
    }

    // Handle different event types
    const eventType = body.type || body['@odata.type'];

    switch (eventType) {
      case 'message':
        return this.handleMessageEvent(body);
      case 'conversationUpdate':
        return this.handleConversationUpdate(body);
      case 'teamRenamed':
        return this.handleTeamRenamed(body);
      default:
        console.log(`Unhandled Teams event type: ${eventType}`);
    }

    return { success: true };
  }

  private validateWebhookSignature(headers: Record<string, string>, body: any): boolean {
    // TODO: Implement Teams webhook signature validation
    // This would involve verifying the HMAC signature in the Authorization header
    return true;
  }

  private async handleMessageEvent(event: any): Promise<void> {
    console.log('Received Teams message:', event);
  }

  private async handleConversationUpdate(event: any): Promise<void> {
    console.log('Teams conversation updated:', event);
  }

  private async handleTeamRenamed(event: any): Promise<void> {
    console.log('Team renamed:', event);
  }
}