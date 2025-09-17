import { gql } from '@apollo/client'

// User Queries
export const GET_ME = gql`
  query GetMe {
    me {
      id
      email
      displayName
      avatarUrl
      status
      preferences
      createdAt
      updatedAt
    }
  }
`

export const GET_USER = gql`
  query GetUser($id: ID!) {
    user(id: $id) {
      id
      email
      displayName
      avatarUrl
      status
      preferences
      createdAt
      updatedAt
      authoredKnowledge {
        id
        title
        status
        createdAt
      }
    }
  }
`

export const GET_USERS = gql`
  query GetUsers($workspaceId: ID!) {
    users(workspaceId: $workspaceId) {
      id
      displayName
      avatarUrl
      status
    }
  }
`

// Workspace Queries
export const GET_WORKSPACE = gql`
  query GetWorkspace($id: ID!) {
    workspace(id: $id) {
      id
      name
      description
      settings
      isActive
      createdAt
      updatedAt
      memberCount
      knowledgeCount
      collections {
        id
        name
        description
        color
        icon
        knowledgeCount
        children {
          id
          name
          knowledgeCount
        }
      }
      tags {
        id
        name
        color
        usageCount
      }
    }
  }
`

export const GET_MY_WORKSPACES = gql`
  query GetMyWorkspaces {
    myWorkspaces {
      id
      name
      description
      isActive
      memberCount
      knowledgeCount
      createdAt
    }
  }
`

// Knowledge Queries
export const GET_KNOWLEDGE = gql`
  query GetKnowledge($id: ID!) {
    knowledge(id: $id) {
      id
      title
      content
      contentDelta
      excerpt
      status
      version
      isTemplate
      templateId
      metadata
      viewCount
      createdAt
      updatedAt
      readTime

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

      comments {
        edges {
          node {
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
            replies {
              id
              content
              createdAt
              author {
                id
                displayName
                avatarUrl
              }
            }
          }
        }
      }

      collaborators {
        id
        displayName
        avatarUrl
      }

      relatedKnowledge {
        id
        title
        excerpt
        author {
          id
          displayName
        }
      }
    }
  }
`

// Standalone comments query for a knowledge document
export const GET_COMMENTS = gql`
  query GetComments($knowledgeId: ID!) {
    comments(knowledgeId: $knowledgeId) {
      edges {
        node {
          id
          content
          positionData
          status
          createdAt
          updatedAt
          knowledgeId
          authorId
          parentId
          author { id displayName avatarUrl }
          replies {
            id
            content
            status
            createdAt
            updatedAt
            knowledgeId
            authorId
            parentId
            author { id displayName avatarUrl }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
      totalCount
    }
  }
`

export const GET_ALL_KNOWLEDGE = gql`
  query GetAllKnowledge(
    $workspaceId: ID!
    $first: Int
    $after: String
    $collectionId: ID
    $tagIds: [ID!]
    $status: [KnowledgeStatus!]
    $authorIds: [ID!]
  ) {
    allKnowledge(
      workspaceId: $workspaceId
      first: $first
      after: $after
      collectionId: $collectionId
      tagIds: $tagIds
      status: $status
      authorIds: $authorIds
    ) {
      edges {
        node {
          id
          title
          excerpt
          status
          viewCount
          readTime
          createdAt
          updatedAt

          author {
            id
            displayName
            avatarUrl
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

          lastModifiedBy {
            id
            displayName
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
`

export const SEARCH_KNOWLEDGE = gql`
  query SearchKnowledge($input: SearchInput!) {
    search(input: $input) {
      id
      type
      title
      excerpt
      content
      score
      highlights
      knowledge {
        id
        title
        status
        createdAt
        author {
          id
          displayName
          avatarUrl
        }
        collection {
          id
          name
          color
        }
      }
    }
  }
`

// Collection Queries
export const GET_COLLECTION = gql`
  query GetCollection($id: ID!) {
    collection(id: $id) {
      id
      name
      description
      color
      icon
      metadata
      sortOrder
      createdAt
      updatedAt
      knowledgeCount
      totalKnowledgeCount

      workspace {
        id
        name
      }

      parent {
        id
        name
      }

      children {
        id
        name
        description
        color
        icon
        knowledgeCount
      }

      knowledge {
        id
        title
        excerpt
        status
        createdAt
        author {
          id
          displayName
          avatarUrl
        }
      }
    }
  }
`

export const GET_COLLECTIONS = gql`
  query GetCollections($workspaceId: ID!) {
    collections(workspaceId: $workspaceId) {
      id
      name
      description
      color
      icon
      knowledgeCount
      sortOrder
      parent {
        id
        name
      }
      children {
        id
        name
        knowledgeCount
      }
    }
  }
`

// Tag Queries
export const GET_TAGS = gql`
  query GetTags($workspaceId: ID!) {
    tags(workspaceId: $workspaceId) {
      id
      name
      color
      usageCount
      createdAt
    }
  }
`

export const GET_POPULAR_TAGS = gql`
  query GetPopularTags($workspaceId: ID!, $limit: Int) {
    popularTags(workspaceId: $workspaceId, limit: $limit) {
      id
      name
      color
      usageCount
    }
  }
`

// Comment Queries
export const GET_COMMENTS = gql`
  query GetComments($knowledgeId: ID!) {
    comments(knowledgeId: $knowledgeId) {
      edges {
        node {
          id
          content
          positionData
          status
          createdAt
          updatedAt

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

          replies {
            id
            content
            createdAt
            author {
              id
              displayName
              avatarUrl
            }
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
`

// Collaboration Queries
export const GET_ACTIVE_COLLABORATORS = gql`
  query GetActiveCollaborators($knowledgeId: ID!) {
    activeCollaborators(knowledgeId: $knowledgeId) {
      id
      socketId
      isActive
      lastSeen
      cursorPos
      selection

      user {
        id
        displayName
        avatarUrl
      }
    }
  }
`

// Analytics Queries
export const GET_WORKSPACE_ANALYTICS = gql`
  query GetWorkspaceAnalytics($workspaceId: ID!) {
    workspaceAnalytics(workspaceId: $workspaceId) {
      totalKnowledge
      totalUsers
      totalCollections
      totalTags

      recentActivity {
        id
        action
        resourceType
        resourceId
        createdAt
        user {
          id
          displayName
          avatarUrl
        }
      }

      popularKnowledge {
        id
        title
        viewCount
        author {
          id
          displayName
        }
      }

      topContributors {
        id
        displayName
        avatarUrl
      }

      knowledgeByStatus {
        status
        count
      }

      activityByDay {
        date
        count
      }
    }
  }
`

export const GET_KNOWLEDGE_ANALYTICS = gql`
  query GetKnowledgeAnalytics($knowledgeId: ID!) {
    knowledgeAnalytics(knowledgeId: $knowledgeId) {
      viewCount
      commentCount
      linkCount
      collaboratorCount
      versionCount
      averageReadTime
      lastViewedAt

      topReferrers {
        id
        title
        author {
          id
          displayName
        }
      }
    }
  }
`

// AI Queries
export const GET_AI_PROCESSING_JOBS = gql`
  query GetAIProcessingJobs($knowledgeId: ID) {
    aiProcessingJobs(knowledgeId: $knowledgeId) {
      id
      jobType
      status
      input
      output
      errorMessage
      processingTime
      retryCount
      createdAt
      completedAt
    }
  }
`
