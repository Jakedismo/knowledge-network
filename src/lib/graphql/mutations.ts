import { gql } from '@apollo/client'

// User Mutations
export const CREATE_USER = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      email
      displayName
      avatarUrl
      status
      createdAt
    }
  }
`

export const UPDATE_USER = gql`
  mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
    updateUser(id: $id, input: $input) {
      id
      email
      displayName
      avatarUrl
      preferences
      updatedAt
    }
  }
`

export const DELETE_USER = gql`
  mutation DeleteUser($id: ID!) {
    deleteUser(id: $id)
  }
`

// Workspace Mutations
export const CREATE_WORKSPACE = gql`
  mutation CreateWorkspace($input: CreateWorkspaceInput!) {
    createWorkspace(input: $input) {
      id
      name
      description
      settings
      isActive
      createdAt
    }
  }
`

export const UPDATE_WORKSPACE = gql`
  mutation UpdateWorkspace($id: ID!, $input: UpdateWorkspaceInput!) {
    updateWorkspace(id: $id, input: $input) {
      id
      name
      description
      settings
      isActive
      updatedAt
    }
  }
`

export const DELETE_WORKSPACE = gql`
  mutation DeleteWorkspace($id: ID!) {
    deleteWorkspace(id: $id)
  }
`

export const ADD_WORKSPACE_MEMBER = gql`
  mutation AddWorkspaceMember($workspaceId: ID!, $userId: ID!, $roleId: ID!) {
    addWorkspaceMember(workspaceId: $workspaceId, userId: $userId, roleId: $roleId) {
      grantedAt
      user {
        id
        displayName
        avatarUrl
      }
      role {
        id
        name
        permissions
      }
    }
  }
`

export const REMOVE_WORKSPACE_MEMBER = gql`
  mutation RemoveWorkspaceMember($workspaceId: ID!, $userId: ID!) {
    removeWorkspaceMember(workspaceId: $workspaceId, userId: $userId)
  }
`

// Knowledge Mutations
export const CREATE_KNOWLEDGE = gql`
  mutation CreateKnowledge($input: CreateKnowledgeInput!) {
    createKnowledge(input: $input) {
      id
      title
      content
      contentDelta
      excerpt
      status
      version
      isTemplate
      createdAt
      updatedAt

      author {
        id
        displayName
        avatarUrl
      }

      workspace {
        id
        name
      }

      collection {
        id
        name
        color
      }

      tags {
        tag {
          id
          name
          color
        }
      }
    }
  }
`

export const UPDATE_KNOWLEDGE = gql`
  mutation UpdateKnowledge($id: ID!, $input: UpdateKnowledgeInput!) {
    updateKnowledge(id: $id, input: $input) {
      id
      title
      content
      contentDelta
      excerpt
      status
      version
      updatedAt

      tags {
        tag {
          id
          name
          color
        }
      }

      collection {
        id
        name
        color
      }
    }
  }
`

export const DELETE_KNOWLEDGE = gql`
  mutation DeleteKnowledge($id: ID!) {
    deleteKnowledge(id: $id)
  }
`

export const PUBLISH_KNOWLEDGE = gql`
  mutation PublishKnowledge($id: ID!) {
    publishKnowledge(id: $id) {
      id
      status
      publishedAt
      updatedAt
    }
  }
`

export const ARCHIVE_KNOWLEDGE = gql`
  mutation ArchiveKnowledge($id: ID!) {
    archiveKnowledge(id: $id) {
      id
      status
      updatedAt
    }
  }
`

export const DUPLICATE_KNOWLEDGE = gql`
  mutation DuplicateKnowledge($id: ID!, $workspaceId: ID!) {
    duplicateKnowledge(id: $id, workspaceId: $workspaceId) {
      id
      title
      content
      status
      createdAt

      author {
        id
        displayName
      }
    }
  }
`

// Collection Mutations
export const CREATE_COLLECTION = gql`
  mutation CreateCollection($input: CreateCollectionInput!) {
    createCollection(input: $input) {
      id
      name
      description
      color
      icon
      metadata
      sortOrder
      createdAt

      workspace {
        id
        name
      }

      parent {
        id
        name
      }
    }
  }
`

export const UPDATE_COLLECTION = gql`
  mutation UpdateCollection($id: ID!, $input: UpdateCollectionInput!) {
    updateCollection(id: $id, input: $input) {
      id
      name
      description
      color
      icon
      metadata
      sortOrder
      updatedAt
    }
  }
`

export const DELETE_COLLECTION = gql`
  mutation DeleteCollection($id: ID!) {
    deleteCollection(id: $id)
  }
`

export const MOVE_COLLECTION = gql`
  mutation MoveCollection($id: ID!, $parentId: ID) {
    moveCollection(id: $id, parentId: $parentId) {
      id
      name
      parent {
        id
        name
      }
    }
  }
`

// Tag Mutations
export const CREATE_TAG = gql`
  mutation CreateTag($input: CreateTagInput!) {
    createTag(input: $input) {
      id
      name
      color
      usageCount
      createdAt
    }
  }
`

export const UPDATE_TAG = gql`
  mutation UpdateTag($id: ID!, $name: String, $color: String) {
    updateTag(id: $id, name: $name, color: $color) {
      id
      name
      color
      usageCount
    }
  }
`

export const DELETE_TAG = gql`
  mutation DeleteTag($id: ID!) {
    deleteTag(id: $id)
  }
`

// Comment Mutations
export const CREATE_COMMENT = gql`
  mutation CreateComment($input: CreateCommentInput!) {
    createComment(input: $input) {
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

export const UPDATE_COMMENT = gql`
  mutation UpdateComment($id: ID!, $input: UpdateCommentInput!) {
    updateComment(id: $id, input: $input) {
      id
      content
      status
      updatedAt
    }
  }
`

export const DELETE_COMMENT = gql`
  mutation DeleteComment($id: ID!) {
    deleteComment(id: $id)
  }
`

export const RESOLVE_COMMENT = gql`
  mutation ResolveComment($id: ID!) {
    resolveComment(id: $id) {
      id
      status
      updatedAt
    }
  }
`

// Link Mutations
export const CREATE_KNOWLEDGE_LINK = gql`
  mutation CreateKnowledgeLink($sourceId: ID!, $targetId: ID!, $linkType: LinkType!) {
    createKnowledgeLink(sourceId: $sourceId, targetId: $targetId, linkType: $linkType) {
      sourceId
      targetId
      linkType
      strength
      createdAt

      source {
        id
        title
      }

      target {
        id
        title
      }
    }
  }
`

export const DELETE_KNOWLEDGE_LINK = gql`
  mutation DeleteKnowledgeLink($sourceId: ID!, $targetId: ID!) {
    deleteKnowledgeLink(sourceId: $sourceId, targetId: $targetId)
  }
`

// Collaboration Mutations
export const START_COLLABORATION = gql`
  mutation StartCollaboration($knowledgeId: ID!) {
    startCollaboration(knowledgeId: $knowledgeId) {
      id
      socketId
      isActive
      lastSeen
      createdAt

      user {
        id
        displayName
        avatarUrl
      }

      knowledge {
        id
        title
      }
    }
  }
`

export const END_COLLABORATION = gql`
  mutation EndCollaboration($knowledgeId: ID!) {
    endCollaboration(knowledgeId: $knowledgeId)
  }
`

export const UPDATE_COLLABORATION_CURSOR = gql`
  mutation UpdateCollaborationCursor($knowledgeId: ID!, $cursorPos: JSON!) {
    updateCollaborationCursor(knowledgeId: $knowledgeId, cursorPos: $cursorPos) {
      id
      cursorPos
      lastSeen
    }
  }
`

export const SEND_COLLABORATION_EVENT = gql`
  mutation SendCollaborationEvent($input: CollaborationEventInput!) {
    sendCollaborationEvent(input: $input)
  }
`

export const GET_COLLABORATION_WS_TOKEN = gql`
  mutation GetCollaborationWsToken($knowledgeId: ID!) {
    getCollaborationWsToken(knowledgeId: $knowledgeId) {
      url
      token
      expiresAt
      roomId
    }
  }
`

// AI Mutations
export const GENERATE_KNOWLEDGE_SUMMARY = gql`
  mutation GenerateKnowledgeSummary($knowledgeId: ID!) {
    generateKnowledgeSummary(knowledgeId: $knowledgeId)
  }
`

export const GENERATE_KNOWLEDGE_TAGS = gql`
  mutation GenerateKnowledgeTags($knowledgeId: ID!) {
    generateKnowledgeTags(knowledgeId: $knowledgeId)
  }
`

export const GENERATE_KNOWLEDGE_LINKS = gql`
  mutation GenerateKnowledgeLinks($knowledgeId: ID!) {
    generateKnowledgeLinks(knowledgeId: $knowledgeId) {
      sourceId
      targetId
      linkType
      strength

      target {
        id
        title
        excerpt
      }
    }
  }
`

export const SCHEDULE_AI_PROCESSING = gql`
  mutation ScheduleAIProcessing($knowledgeId: ID!, $jobType: String!) {
    scheduleAIProcessing(knowledgeId: $knowledgeId, jobType: $jobType) {
      id
      jobType
      status
      createdAt
    }
  }
`
