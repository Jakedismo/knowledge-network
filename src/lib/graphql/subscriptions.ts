import { gql } from '@apollo/client'

// Knowledge Subscriptions
export const KNOWLEDGE_UPDATED = gql`
  subscription KnowledgeUpdated($knowledgeId: ID!) {
    knowledgeUpdated(knowledgeId: $knowledgeId) {
      id
      title
      content
      contentDelta
      status
      version
      updatedAt

      lastModifiedBy {
        id
        displayName
        avatarUrl
      }
    }
  }
`

// Collaboration Subscriptions
export const COLLABORATION_EVENT = gql`
  subscription CollaborationEvent($knowledgeId: ID!) {
    collaborationEvent(knowledgeId: $knowledgeId) {
      type
      data
      knowledgeId
      timestamp

      user {
        id
        displayName
        avatarUrl
      }
    }
  }
`

// Comment Subscriptions
export const COMMENT_ADDED = gql`
  subscription CommentAdded($knowledgeId: ID!) {
    commentAdded(knowledgeId: $knowledgeId) {
      id
      content
      positionData
      status
      createdAt

      author {
        id
        displayName
        avatarUrl
      }

      parent {
        id
        content
        author {
          id
          displayName
        }
      }
    }
  }
`

// Activity Subscriptions
export const ACTIVITY_LOG = gql`
  subscription ActivityLog($workspaceId: ID!) {
    activityLog(workspaceId: $workspaceId) {
      id
      action
      resourceType
      resourceId
      metadata
      createdAt

      user {
        id
        displayName
        avatarUrl
      }
    }
  }
`