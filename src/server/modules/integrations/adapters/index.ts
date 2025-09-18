/**
 * Integration Adapters
 * Export all available integration adapters for the Knowledge Network application
 */

export { SlackAdapter } from './slack.adapter';
export { TeamsAdapter } from './teams.adapter';
export { GitHubAdapter } from './github.adapter';
export { JiraAdapter } from './jira.adapter';
export { GoogleDriveAdapter } from './google-drive.adapter';

// Adapter factory for dynamic instantiation
export const createAdapter = (type: string) => {
  switch (type) {
    case 'slack':
      return new (require('./slack.adapter').SlackAdapter)();
    case 'teams':
      return new (require('./teams.adapter').TeamsAdapter)();
    case 'github':
      return new (require('./github.adapter').GitHubAdapter)();
    case 'jira':
      return new (require('./jira.adapter').JiraAdapter)();
    case 'google-drive':
      return new (require('./google-drive.adapter').GoogleDriveAdapter)();
    default:
      throw new Error(`Unknown adapter type: ${type}`);
  }
};