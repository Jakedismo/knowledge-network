import { gql } from '@apollo/client'

// GraphQL schema for Knowledge Network Application
// Based on backend-api-architecture specifications

export const typeDefs = gql`
  # Scalars
  scalar DateTime
  scalar JSON
  scalar Upload

  # Enums
  enum UserRole {
    ADMIN
    EDITOR
    CONTRIBUTOR
    VIEWER
  }

  enum KnowledgeStatus {
    DRAFT
    REVIEW
    PUBLISHED
    ARCHIVED
  }

  enum ActivityAction {
    CREATE
    UPDATE
    DELETE
    VIEW
    SHARE
    COMMENT
    COLLABORATE
  }

  enum LinkType {
    REFERENCES
    MENTIONS
    RELATED
    PARENT_CHILD
    DUPLICATE
  }

  enum CommentStatus {
    OPEN
    RESOLVED
    ARCHIVED
  }

  # Core Types
  type User {
    id: ID!
    email: String!
    displayName: String!
    avatarUrl: String
    status: String!
    preferences: JSON
    createdAt: DateTime!
    updatedAt: DateTime!

    # Relations
    authoredKnowledge: [Knowledge!]!
    workspaceRoles: [UserWorkspaceRole!]!
    comments: [Comment!]!
    activityLogs: [ActivityLog!]!
  }

  type Workspace {
    id: ID!
    name: String!
    description: String
    settings: JSON
    isActive: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!

    # Relations
    knowledge: [Knowledge!]!
    collections: [Collection!]!
    tags: [Tag!]!
    roles: [Role!]!
    userRoles: [UserWorkspaceRole!]!
    activityLogs: [ActivityLog!]!

    # Computed fields
    memberCount: Int!
    knowledgeCount: Int!
  }

  type Knowledge {
    id: ID!
    title: String!
    content: String!
    contentDelta: JSON
    excerpt: String
    status: KnowledgeStatus!
    version: Int!
    isTemplate: Boolean!
    templateId: String
    metadata: JSON
    viewCount: Int!
    createdAt: DateTime!
    updatedAt: DateTime!

    # Foreign Keys
    workspaceId: ID!
    authorId: ID!
    collectionId: ID

    # Relations
    workspace: Workspace!
    author: User!
    collection: Collection
    tags: [KnowledgeTag!]!
    comments: [Comment!]!
    versions: [KnowledgeVersion!]!
    sourceLinks: [KnowledgeLink!]!
    targetLinks: [KnowledgeLink!]!
    collaborationSessions: [CollaborationSession!]!

    # Computed fields
    readTime: Int!
    lastModifiedBy: User
    relatedKnowledge: [Knowledge!]!
    collaborators: [User!]!
  }

  type Collection {
    id: ID!
    name: String!
    description: String
    color: String
    icon: String
    metadata: JSON
    sortOrder: Int!
    createdAt: DateTime!
    updatedAt: DateTime!

    # Foreign Keys
    workspaceId: ID!
    parentId: ID

    # Relations
    workspace: Workspace!
    parent: Collection
    children: [Collection!]!
    knowledge: [Knowledge!]!

    # Computed fields
    knowledgeCount: Int!
    totalKnowledgeCount: Int!
  }

  type Tag {
    id: ID!
    name: String!
    color: String
    usageCount: Int!
    createdAt: DateTime!

    # Foreign Keys
    workspaceId: ID!

    # Relations
    workspace: Workspace!
    knowledge: [KnowledgeTag!]!
  }

  type KnowledgeTag {
    knowledge: Knowledge!
    tag: Tag!
  }

  type KnowledgeLink {
    sourceId: ID!
    targetId: ID!
    linkType: LinkType!
    strength: Float!
    createdAt: DateTime!

    # Relations
    source: Knowledge!
    target: Knowledge!
  }

  type KnowledgeVersion {
    id: ID!
    versionNumber: Int!
    content: String!
    contentDelta: JSON
    changeSummary: String
    diffData: JSON
    createdAt: DateTime!

    # Foreign Keys
    knowledgeId: ID!
    authorId: ID!

    # Relations
    knowledge: Knowledge!
    author: User!
  }

  type Comment {
    id: ID!
    content: String!
    positionData: JSON
    status: CommentStatus!
    createdAt: DateTime!
    updatedAt: DateTime!

    # Foreign Keys
    knowledgeId: ID!
    authorId: ID!
    parentId: ID

    # Relations
    knowledge: Knowledge!
    author: User!
    parent: Comment
    replies: [Comment!]!
  }

  type Role {
    id: ID!
    name: String!
    description: String
    permissions: JSON!
    isSystemRole: Boolean!
    createdAt: DateTime!

    # Foreign Keys
    workspaceId: ID!

    # Relations
    workspace: Workspace!
    userRoles: [UserWorkspaceRole!]!
  }

  type UserWorkspaceRole {
    grantedAt: DateTime!

    # Foreign Keys
    userId: ID!
    workspaceId: ID!
    roleId: ID!

    # Relations
    user: User!
    workspace: Workspace!
    role: Role!
  }

  type CollaborationSession {
    id: ID!
    socketId: String
    isActive: Boolean!
    lastSeen: DateTime!
    cursorPos: JSON
    selection: JSON
    createdAt: DateTime!

    # Foreign Keys
    userId: ID!
    knowledgeId: ID!

    # Relations
    user: User!
    knowledge: Knowledge!
  }

  type ActivityLog {
    id: ID!
    action: ActivityAction!
    resourceType: String!
    resourceId: String
    metadata: JSON
    ipAddress: String
    userAgent: String
    createdAt: DateTime!

    # Foreign Keys
    userId: ID
    workspaceId: ID

    # Relations
    user: User
    workspace: Workspace
  }

  type SearchResult {
    id: ID!
    type: String!
    title: String!
    excerpt: String
    content: String
    score: Float!
    highlights: [String!]!
    knowledge: Knowledge
  }

  type AIProcessingJob {
    id: ID!
    jobType: String!
    status: String!
    input: JSON!
    output: JSON
    errorMessage: String
    processingTime: Int
    retryCount: Int!
    createdAt: DateTime!
    completedAt: DateTime

    # Foreign Keys
    knowledgeId: ID
  }

  # Input Types
  input CreateUserInput {
    email: String!
    displayName: String!
    passwordHash: String!
    avatarUrl: String
    preferences: JSON
  }

  input UpdateUserInput {
    displayName: String
    avatarUrl: String
    preferences: JSON
  }

  input CreateWorkspaceInput {
    name: String!
    description: String
    settings: JSON
  }

  input UpdateWorkspaceInput {
    name: String
    description: String
    settings: JSON
    isActive: Boolean
  }

  input CreateKnowledgeInput {
    title: String!
    content: String!
    contentDelta: JSON
    excerpt: String
    status: KnowledgeStatus
    isTemplate: Boolean
    templateId: String
    metadata: JSON
    workspaceId: ID!
    collectionId: ID
    tagIds: [ID!]
  }

  input UpdateKnowledgeInput {
    title: String
    content: String
    contentDelta: JSON
    excerpt: String
    status: KnowledgeStatus
    isTemplate: Boolean
    templateId: String
    metadata: JSON
    collectionId: ID
    tagIds: [ID!]
  }

  input CreateCollectionInput {
    name: String!
    description: String
    color: String
    icon: String
    metadata: JSON
    workspaceId: ID!
    parentId: ID
  }

  input UpdateCollectionInput {
    name: String
    description: String
    color: String
    icon: String
    metadata: JSON
    parentId: ID
    sortOrder: Int
  }

  input CreateTagInput {
    name: String!
    color: String
    workspaceId: ID!
  }

  input CreateCommentInput {
    content: String!
    positionData: JSON
    knowledgeId: ID!
    parentId: ID
  }

  input UpdateCommentInput {
    content: String
    status: CommentStatus
  }

  input SearchInput {
    query: String!
    workspaceId: ID
    collectionIds: [ID!]
    tagIds: [ID!]
    status: [KnowledgeStatus!]
    authorIds: [ID!]
    limit: Int
    offset: Int
  }

  input CollaborationEventInput {
    type: String!
    data: JSON!
    knowledgeId: ID!
  }

  # Pagination
  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  type KnowledgeConnection {
    edges: [KnowledgeEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type KnowledgeEdge {
    node: Knowledge!
    cursor: String!
  }

  type CommentConnection {
    edges: [CommentEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type CommentEdge {
    node: Comment!
    cursor: String!
  }

  # Subscriptions
  type Subscription {
    knowledgeUpdated(knowledgeId: ID!): Knowledge!
    collaborationEvent(knowledgeId: ID!): CollaborationEvent!
    commentAdded(knowledgeId: ID!): Comment!
    activityLog(workspaceId: ID!): ActivityLog!
  }

  type CollaborationEvent {
    type: String!
    data: JSON!
    user: User!
    knowledgeId: ID!
    timestamp: DateTime!
  }

  # Root Types
  type Query {
    # User queries
    me: User
    user(id: ID!): User
    users(workspaceId: ID!): [User!]!

    # Workspace queries
    workspace(id: ID!): Workspace
    workspaces: [Workspace!]!
    myWorkspaces: [Workspace!]!

    # Knowledge queries
    knowledge(id: ID!): Knowledge
    knowledgeBySlug(workspaceId: ID!, slug: String!): Knowledge
    allKnowledge(
      workspaceId: ID!
      first: Int
      after: String
      collectionId: ID
      tagIds: [ID!]
      status: [KnowledgeStatus!]
      authorIds: [ID!]
    ): KnowledgeConnection!

    # Collection queries
    collection(id: ID!): Collection
    collections(workspaceId: ID!): [Collection!]!

    # Tag queries
    tag(id: ID!): Tag
    tags(workspaceId: ID!): [Tag!]!
    popularTags(workspaceId: ID!, limit: Int): [Tag!]!

    # Comment queries
    comments(knowledgeId: ID!): CommentConnection!

    # Search queries
    search(input: SearchInput!): [SearchResult!]!
    searchSuggestions(query: String!, workspaceId: ID!): [String!]!

    # Analytics queries
    workspaceAnalytics(workspaceId: ID!): WorkspaceAnalytics!
    knowledgeAnalytics(knowledgeId: ID!): KnowledgeAnalytics!

    # Collaboration queries
    activeCollaborators(knowledgeId: ID!): [CollaborationSession!]!

    # AI queries
    aiProcessingJobs(knowledgeId: ID): [AIProcessingJob!]!
  }

  type Mutation {
    # User mutations
    createUser(input: CreateUserInput!): User!
    updateUser(id: ID!, input: UpdateUserInput!): User!
    deleteUser(id: ID!): Boolean!

    # Workspace mutations
    createWorkspace(input: CreateWorkspaceInput!): Workspace!
    updateWorkspace(id: ID!, input: UpdateWorkspaceInput!): Workspace!
    deleteWorkspace(id: ID!): Boolean!
    addWorkspaceMember(workspaceId: ID!, userId: ID!, roleId: ID!): UserWorkspaceRole!
    removeWorkspaceMember(workspaceId: ID!, userId: ID!): Boolean!

    # Knowledge mutations
    createKnowledge(input: CreateKnowledgeInput!): Knowledge!
    updateKnowledge(id: ID!, input: UpdateKnowledgeInput!): Knowledge!
    deleteKnowledge(id: ID!): Boolean!
    publishKnowledge(id: ID!): Knowledge!
    archiveKnowledge(id: ID!): Knowledge!
    duplicateKnowledge(id: ID!, workspaceId: ID!): Knowledge!

    # Collection mutations
    createCollection(input: CreateCollectionInput!): Collection!
    updateCollection(id: ID!, input: UpdateCollectionInput!): Collection!
    deleteCollection(id: ID!): Boolean!
    moveCollection(id: ID!, parentId: ID): Collection!

    # Tag mutations
    createTag(input: CreateTagInput!): Tag!
    updateTag(id: ID!, name: String, color: String): Tag!
    deleteTag(id: ID!): Boolean!

    # Comment mutations
    createComment(input: CreateCommentInput!): Comment!
    updateComment(id: ID!, input: UpdateCommentInput!): Comment!
    deleteComment(id: ID!): Boolean!
    resolveComment(id: ID!): Comment!

    # Link mutations
    createKnowledgeLink(sourceId: ID!, targetId: ID!, linkType: LinkType!): KnowledgeLink!
    deleteKnowledgeLink(sourceId: ID!, targetId: ID!): Boolean!

    # Collaboration mutations
    startCollaboration(knowledgeId: ID!): CollaborationSession!
    endCollaboration(knowledgeId: ID!): Boolean!
    updateCollaborationCursor(knowledgeId: ID!, cursorPos: JSON!): CollaborationSession!
    sendCollaborationEvent(input: CollaborationEventInput!): Boolean!

    # AI mutations
    generateKnowledgeSummary(knowledgeId: ID!): String!
    generateKnowledgeTags(knowledgeId: ID!): [String!]!
    generateKnowledgeLinks(knowledgeId: ID!): [KnowledgeLink!]!
    scheduleAIProcessing(knowledgeId: ID!, jobType: String!): AIProcessingJob!
  }

  # Analytics Types
  type WorkspaceAnalytics {
    totalKnowledge: Int!
    totalUsers: Int!
    totalCollections: Int!
    totalTags: Int!
    recentActivity: [ActivityLog!]!
    popularKnowledge: [Knowledge!]!
    topContributors: [User!]!
    knowledgeByStatus: [StatusCount!]!
    activityByDay: [DayActivity!]!
  }

  type KnowledgeAnalytics {
    viewCount: Int!
    commentCount: Int!
    linkCount: Int!
    collaboratorCount: Int!
    versionCount: Int!
    averageReadTime: Float!
    lastViewedAt: DateTime
    topReferrers: [Knowledge!]!
  }

  type StatusCount {
    status: KnowledgeStatus!
    count: Int!
  }

  type DayActivity {
    date: String!
    count: Int!
  }
`