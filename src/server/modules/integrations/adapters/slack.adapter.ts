import { WebClient } from '@slack/web-api';
import {
  IntegrationAdapter,
  IntegrationContext,
  IntegrationCredentials,
  IntegrationError,
} from '../types';

export class SlackAdapter extends IntegrationAdapter {
  private client?: WebClient;

  async initialize(credentials: IntegrationCredentials): Promise<void> {
    if (!credentials.accessToken) {
      throw new IntegrationError('Slack access token is required');
    }

    this.client = new WebClient(credentials.accessToken);
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
      throw new IntegrationError('Slack client not initialized');
    }

    switch (action) {
      case 'test':
        return this.testConnection();
      case 'send_notification':
        return this.sendNotification(payload);
      case 'create_channel':
        return this.createChannel(payload);
      case 'invite_users':
        return this.inviteUsers(payload);
      case 'post_message':
        return this.postMessage(payload);
      case 'upload_file':
        return this.uploadFile(payload);
      case 'get_channels':
        return this.getChannels(payload);
      case 'get_users':
        return this.getUsers(payload);
      default:
        throw new IntegrationError(`Unknown action: ${action}`);
    }
  }

  async validateCredentials(credentials: IntegrationCredentials): Promise<boolean> {
    try {
      await this.initialize(credentials);
      const result = await this.client!.auth.test();
      return result.ok === true;
    } catch {
      return false;
    }
  }

  private async testConnection(): Promise<any> {
    const result = await this.client!.auth.test();
    return {
      connected: result.ok,
      team: result.team,
      user: result.user,
    };
  }

  private async sendNotification(payload: {
    channel: string;
    text: string;
    attachments?: any[];
    blocks?: any[];
  }): Promise<void> {
    await this.client!.chat.postMessage({
      channel: payload.channel,
      text: payload.text,
      attachments: payload.attachments,
      blocks: payload.blocks,
    });
  }

  private async createChannel(payload: {
    name: string;
    isPrivate?: boolean;
    description?: string;
  }): Promise<string> {
    const result = await this.client!.conversations.create({
      name: payload.name,
      is_private: payload.isPrivate || false,
      description: payload.description,
    });

    return result.channel?.id || '';
  }

  private async inviteUsers(payload: {
    channel: string;
    users: string[];
  }): Promise<void> {
    await this.client!.conversations.invite({
      channel: payload.channel,
      users: payload.users.join(','),
    });
  }

  private async postMessage(payload: {
    channel: string;
    text?: string;
    blocks?: any[];
    threadTs?: string;
  }): Promise<any> {
    const result = await this.client!.chat.postMessage({
      channel: payload.channel,
      text: payload.text,
      blocks: payload.blocks,
      thread_ts: payload.threadTs,
    });

    return {
      messageId: result.ts,
      channel: result.channel,
    };
  }

  private async uploadFile(payload: {
    channels: string[];
    file: Buffer;
    filename: string;
    title?: string;
    initial_comment?: string;
  }): Promise<any> {
    const result = await this.client!.files.uploadV2({
      channels: payload.channels.join(','),
      file: payload.file,
      filename: payload.filename,
      title: payload.title,
      initial_comment: payload.initial_comment,
    });

    return result.file;
  }

  private async getChannels(payload: {
    types?: string;
    limit?: number;
  }): Promise<any[]> {
    const result = await this.client!.conversations.list({
      types: payload.types || 'public_channel,private_channel',
      limit: payload.limit || 100,
    });

    return result.channels || [];
  }

  private async getUsers(payload: {
    limit?: number;
  }): Promise<any[]> {
    const result = await this.client!.users.list({
      limit: payload.limit || 100,
    });

    return result.members || [];
  }

  // Webhook handling for Slack events
  async handleWebhook(headers: Record<string, string>, body: any): Promise<any> {
    // Handle Slack URL verification
    if (body.type === 'url_verification') {
      return { challenge: body.challenge };
    }

    // Handle Slack events
    if (body.type === 'event_callback') {
      const event = body.event;

      switch (event.type) {
        case 'message':
          // Handle incoming messages
          return this.handleMessageEvent(event);
        case 'app_mention':
          // Handle app mentions
          return this.handleMentionEvent(event);
        case 'reaction_added':
          // Handle reactions
          return this.handleReactionEvent(event);
        default:
          console.log(`Unhandled Slack event type: ${event.type}`);
      }
    }

    return { success: true };
  }

  private async handleMessageEvent(event: any): Promise<void> {
    // Process incoming message
    console.log('Received Slack message:', event);
  }

  private async handleMentionEvent(event: any): Promise<void> {
    // Process app mention
    console.log('App mentioned in Slack:', event);
  }

  private async handleReactionEvent(event: any): Promise<void> {
    // Process reaction
    console.log('Reaction added in Slack:', event);
  }
}