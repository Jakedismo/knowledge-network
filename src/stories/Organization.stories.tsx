import type { Meta, StoryObj } from '@storybook/react'
import { Breadcrumbs } from '@/components/organization/Breadcrumbs'
import { WorkspaceSwitcher } from '@/components/organization/WorkspaceSwitcher'
import { TreeView } from '@/components/organization/TreeView'
import { TagManager } from '@/components/organization/TagManager'
import { MetadataForm } from '@/components/organization/MetadataForm'
import type { MetadataFieldDefinition, TagOption, TreeMoveEvent, TreeNode, WorkspaceOption } from '@/components/organization/types'
import React from 'react'

const meta: Meta = {
  title: 'Organization/Components',
}
export default meta

export const BreadcrumbsDemo: StoryObj = {
  render: () => (
    <div className="p-4">
      <Breadcrumbs items={[
        { label: 'Acme' },
        { label: 'Engineering', href: '#' },
        { label: 'Docs', href: '#' },
        { label: 'Architecture.md' },
      ]} />
    </div>
  )
}

export const WorkspaceSwitcherDemo: StoryObj = {
  render: () => {
    const workspaces: WorkspaceOption[] = [
      { id: 'w1', name: 'Acme', slug: 'acme' },
      { id: 'w2', name: 'Personal', slug: 'me' },
      { id: 'w3', name: 'Research', slug: 'rnd' },
    ]
    const [current, setCurrent] = React.useState('w1')
    return (
      <div className="p-4 max-w-sm">
        <WorkspaceSwitcher workspaces={workspaces} currentId={current} onSwitch={setCurrent} />
      </div>
    )
  }
}

export const TreeViewDemo: StoryObj = {
  render: () => {
    const [tree, setTree] = React.useState<TreeNode[]>([
      { id: '1', name: 'Root', isExpanded: true, children: [
        { id: '1-1', name: 'Design', children: [] },
        { id: '1-2', name: 'Specs', children: [ { id: '1-2-1', name: 'API.md', children: [] } ] },
      ] }
    ])

    function toggle(id: string, expanded: boolean) {
      function rec(nodes: TreeNode[]): TreeNode[] {
        return nodes.map(n => n.id === id ? { ...n, isExpanded: expanded } : { ...n, children: n.children && rec(n.children) })
      }
      setTree(rec)
    }

    function move(e: TreeMoveEvent) {
      // simplistic move for demo: remove + append inside target
      function remove(nodes: TreeNode[], id: string): [TreeNode[], TreeNode | null] {
        const out: TreeNode[] = []
        let removed: TreeNode | null = null
        for (const n of nodes) {
          if (n.id === id) { removed = n; continue }
          const [children, r] = n.children ? remove(n.children, id) : [undefined, null]
          if (r) removed = r
          out.push(children ? { ...n, children } : n)
        }
        return [out, removed]
      }
      function insert(nodes: TreeNode[], target: string, item: TreeNode): TreeNode[] {
        return nodes.map(n => {
          if (n.id === target) {
            const children = n.children
            return { ...n, isExpanded: true, children: [...children, { ...item, children: item.children }] }
          }
          return n.children ? { ...n, children: insert(n.children, target, item) } : n
        })
      }
      setTree(prev => {
        const [stripped, node] = remove(prev, e.sourceId)
        if (!node) return prev
        if (e.position === 'inside') return insert(stripped, e.targetId, node)
        // For before/after, simply insert inside parent of target for demo purposes
        return insert(stripped, e.targetId, node)
      })
    }

    return (
      <div className="p-4">
        <TreeView nodes={tree} onToggle={toggle} onMove={move} />
      </div>
    )
  }
}

export const TagManagerDemo: StoryObj = {
  render: () => {
    const [tags, setTags] = React.useState<TagOption[]>([{ id: 'react', label: 'React' }])
    const suggestions: TagOption[] = [
      { id: 'nextjs', label: 'Next.js' },
      { id: 'performance', label: 'Performance' },
      { id: 'a11y', label: 'Accessibility' },
      { id: 'security', label: 'Security' },
    ]
    return (
      <div className="p-4 max-w-lg">
        <TagManager value={tags} onChange={setTags} suggestions={suggestions} />
      </div>
    )
  }
}

export const MetadataFormDemo: StoryObj = {
  render: () => {
    const fields: MetadataFieldDefinition[] = [
      { name: 'author', label: 'Author', type: 'text' },
      { name: 'readTime', label: 'Read time (min)', type: 'number' },
      { name: 'reviewed', label: 'Reviewed', type: 'boolean' },
      { name: 'category', label: 'Category', type: 'select', options: [ { label: 'Guide', value: 'guide' }, { label: 'Spec', value: 'spec' } ] },
      { name: 'links', label: 'Related Links', type: 'multiselect', description: 'Comma separated list' },
    ]
    return (
      <div className="p-4 max-w-md">
        <MetadataForm fields={fields} onSubmit={(v) => console.log(v)} />
      </div>
    )
  }
}
