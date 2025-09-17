import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import { EditorOrganizationPanel } from '@/components/organization/EditorOrganizationPanel'
import { EditorShell } from '@/components/editor/editor-shell'
import type { TagOption, TreeMoveEvent, TreeNode, WorkspaceOption } from '@/components/organization/types'
import { MockedProvider } from '@apollo/client/testing'
import { GET_MY_WORKSPACES, GET_WORKSPACE } from '@/lib/graphql/queries'
import { GET_KNOWLEDGE, } from '@/lib/graphql/queries'
import { EditorOrganizationApolloPanel } from '@/components/organization/EditorOrganizationApolloPanel'

const meta: Meta = {
  title: 'Organization/EditorOrganizationPanel',
  parameters: {
    a11y: { disableAnimations: true },
    viewport: { defaultViewport: 'responsive' },
  },
}
export default meta

export const LocalStateDemo: StoryObj = {
  render: () => {
    const workspaces: WorkspaceOption[] = [
      { id: 'w1', name: 'Acme' },
      { id: 'w2', name: 'Personal' },
    ]
    const [current, setCurrent] = React.useState('w1')
    const [tree, setTree] = React.useState<TreeNode[]>([{
      id: 'root', name: 'Root', isExpanded: true, isSelected: false, children: [
        { id: 'design', name: 'Design', isExpanded: false, isSelected: false, children: [] },
        { id: 'specs', name: 'Specs', isExpanded: true, isSelected: false, children: [ { id: 'api', name: 'API', isExpanded: false, isSelected: false, children: [] } ] },
      ],
    }])
    const [tags, setTags] = React.useState<TagOption[]>([{ id: 'a11y', label: 'Accessibility' }])
    const fields = [
      { name: 'owner', label: 'Owner', type: 'text' as const },
      { name: 'priority', label: 'Priority', type: 'select' as const, options: [ { label: 'Low', value: 'low' }, { label: 'High', value: 'high' } ] },
      { name: 'reviewed', label: 'Reviewed', type: 'boolean' as const },
    ]

    function moveTree(e: TreeMoveEvent) {
      // demo: move inside only
      setTree(prev => {
        function remove(nodes: TreeNode[], id: string): [TreeNode[], TreeNode | null] {
          const out: TreeNode[] = []
          let removed: TreeNode | null = null
          for (const n of nodes) {
            if (n.id === id) { removed = n; continue }
            const [children, r] = remove(n.children, id)
            if (r) removed = r
            out.push({ ...n, children })
          }
          return [out, removed]
        }
        function insert(nodes: TreeNode[], target: string, item: TreeNode): TreeNode[] {
          return nodes.map(n => n.id === target ? { ...n, isExpanded: true, children: [...n.children, { ...item }] } : { ...n, children: insert(n.children, target, item) })
        }
        const [stripped, node] = remove(prev, e.sourceId)
        if (!node) return prev
        if (e.position === 'inside') return insert(stripped, e.targetId, node)
        return insert(stripped, e.targetId, node)
      })
    }

    return (
      <div className="p-4 max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-4">
          <div className="border rounded-md bg-background p-0">
            <EditorShell initialContent={'<p>Start writing documentation…</p>'} />
          </div>
          <EditorOrganizationPanel
            workspaces={workspaces}
            currentWorkspaceId={current}
            onSwitchWorkspace={setCurrent}
            tree={tree}
            onTreeMove={moveTree}
            breadcrumbs={[{ label: 'Acme' }, { label: 'Docs' }, { label: 'API' }]}
            tags={tags}
            onTagsChange={setTags}
            tagSuggestions={[{ id: 'react', label: 'React' }, { id: 'nextjs', label: 'Next.js' }]}
            metadataFields={fields}
            metadataValues={{ owner: 'Dana' }}
          />
        </div>
      </div>
    )
  }
}

export const ApolloMockDemo: StoryObj = {
  render: () => {
    const mocks = [
      {
        request: { query: GET_MY_WORKSPACES },
        result: {
          data: {
            myWorkspaces: [
              { id: 'w1', name: 'Acme', description: 'Acme', isActive: true, memberCount: 5, knowledgeCount: 42, createdAt: new Date().toISOString() },
              { id: 'w2', name: 'Personal', description: 'Me', isActive: true, memberCount: 1, knowledgeCount: 3, createdAt: new Date().toISOString() },
            ],
          },
        },
      },
      {
        request: { query: GET_WORKSPACE, variables: { id: 'w1' } },
        result: {
          data: {
            workspace: {
              id: 'w1', name: 'Acme', description: 'Acme', settings: {}, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), memberCount: 5, knowledgeCount: 42,
              collections: [
                { id: 'c1', name: 'Design', description: '', color: null, icon: null, knowledgeCount: 10, children: [] },
                { id: 'c2', name: 'Specs', description: '', color: null, icon: null, knowledgeCount: 5, children: [ { id: 'c2-1', name: 'API', knowledgeCount: 3, children: [] } ] },
              ],
              tags: [
                { id: 't1', name: 'React', color: '#61dafb', usageCount: 12 },
                { id: 't2', name: 'Next.js', color: '#000', usageCount: 8 },
              ],
            },
          },
        },
      },
      {
        request: { query: GET_KNOWLEDGE, variables: { id: 'k1' } },
        result: {
          data: {
            knowledge: {
              id: 'k1',
              title: 'API Guidelines',
              content: '',
              contentDelta: null,
              excerpt: '',
              status: 'draft',
              version: 1,
              isTemplate: false,
              templateId: null,
              metadata: { owner: 'Dana' },
              viewCount: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              readTime: 1,
              author: { id: 'u1', displayName: 'Dana', avatarUrl: null },
              workspace: { id: 'w1', name: 'Acme' },
              collection: { id: 'c2', name: 'Specs', color: null },
              tags: [ { tag: { id: 't1', name: 'React', color: '#61dafb' } } ],
              comments: { edges: [] },
              collaborators: [],
              relatedKnowledge: [],
            },
          },
        },
      },
    ]

    function Container() {
      const [current, setCurrent] = React.useState('w1')
      // In a real app we’d use hooks; here we inline to keep the story simple.
      const workspaces: WorkspaceOption[] = [ { id: 'w1', name: 'Acme' }, { id: 'w2', name: 'Personal' } ]
      const [tree, setTree] = React.useState<TreeNode[]>([{ id: 'c-root', name: 'Root', isExpanded: true, isSelected: false, children: [] }])
      const [tags, setTags] = React.useState<TagOption[]>([])
      React.useEffect(() => {
        // Normally populated from GET_WORKSPACE via mocks above
        setTree([
          { id: 'c1', name: 'Design', isExpanded: false, isSelected: false, children: [] },
          { id: 'c2', name: 'Specs', isExpanded: true, isSelected: false, children: [ { id: 'c2-1', name: 'API', isExpanded: false, isSelected: false, children: [] } ] },
        ])
        setTags([{ id: 't1', label: 'React' }])
      }, [current])

      const fields = [ { name: 'owner', label: 'Owner', type: 'text' as const } ]
      const suggestions = [ { id: 'nextjs', label: 'Next.js' }, { id: 'a11y', label: 'Accessibility' } ]

      return (
        <div className="p-4 max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-4">
            <div className="border rounded-md bg-background p-0">
              <EditorShell initialContent={'<p>Start writing documentation…</p>'} />
            </div>
            <EditorOrganizationApolloPanel knowledgeId={'k1'} />
          </div>
        </div>
      )
    }

    return (
      <MockedProvider mocks={mocks} addTypename={false}>
        <Container />
      </MockedProvider>
    )
  }
}
