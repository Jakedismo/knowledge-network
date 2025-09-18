import {
  Home,
  Search,
  FileText,
  Users,
  BarChart3,
  Settings,
  Plus,
  Folder,
  Tag,
  Edit3,
  Sparkles,
  Bell,
  User,
  Activity,
  MessageSquare,
  FileCheck,
  Database,
  Layout,
  type LucideIcon
} from 'lucide-react'

export interface NavItem {
  id: string
  label: string
  path: string
  icon: LucideIcon
  badge?: number | string
  children?: NavItem[]
  quickAction?: boolean
  shortcut?: string
  permissions?: string[]
  position?: 'primary' | 'secondary' | 'header'
  mobileHidden?: boolean
}

// Primary navigation items that appear in the sidebar
export const primaryNavigation: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: Home,
    position: 'primary',
  },
  {
    id: 'knowledge',
    label: 'Knowledge Base',
    path: '/knowledge',
    icon: FileText,
    position: 'primary',
    children: [
      {
        id: 'knowledge-documents',
        label: 'Documents',
        path: '/knowledge/documents',
        icon: FileText,
      },
      {
        id: 'knowledge-collections',
        label: 'Collections',
        path: '/knowledge/collections',
        icon: Folder,
      },
      {
        id: 'knowledge-templates',
        label: 'Templates',
        path: '/templates',
        icon: Layout,
      },
      {
        id: 'knowledge-tags',
        label: 'Tags',
        path: '/knowledge/tags',
        icon: Tag,
      },
    ],
  },
  {
    id: 'editor',
    label: 'Editor',
    path: '/editor',
    icon: Edit3,
    position: 'primary',
    quickAction: true,
    shortcut: 'Cmd+E',
  },
  {
    id: 'search',
    label: 'Search',
    path: '/search',
    icon: Search,
    position: 'primary',
    shortcut: 'Cmd+K',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    path: '/analytics',
    icon: BarChart3,
    position: 'primary',
    children: [
      {
        id: 'analytics-overview',
        label: 'Overview',
        path: '/analytics',
        icon: BarChart3,
      },
      {
        id: 'analytics-reports',
        label: 'Reports',
        path: '/analytics/reports',
        icon: FileCheck,
      },
      {
        id: 'analytics-insights',
        label: 'Insights',
        path: '/analytics/insights',
        icon: Sparkles,
      },
    ],
  },
  {
    id: 'collaboration',
    label: 'Collaboration',
    path: '/collaboration',
    icon: Users,
    position: 'primary',
    children: [
      {
        id: 'collaboration-active',
        label: 'Active Sessions',
        path: '/collaboration/active',
        icon: Activity,
      },
      {
        id: 'collaboration-activity',
        label: 'Team Activity',
        path: '/collaboration/activity',
        icon: Activity,
      },
      {
        id: 'collaboration-reviews',
        label: 'Reviews',
        path: '/collaboration/reviews',
        icon: MessageSquare,
      },
    ],
  },
]

// Secondary navigation items (bottom of sidebar)
export const secondaryNavigation: NavItem[] = [
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: Settings,
    position: 'secondary',
  },
]

// Header navigation items (appear in top header)
export const headerNavigation: NavItem[] = [
  {
    id: 'notifications',
    label: 'Notifications',
    path: '/notifications',
    icon: Bell,
    position: 'header',
    badge: 3, // This would be dynamic in real app
  },
  {
    id: 'profile',
    label: 'Profile',
    path: '/profile',
    icon: User,
    position: 'header',
  },
]

// Mobile navigation - 5 primary items for bottom nav
export const mobileNavigation: NavItem[] = [
  {
    id: 'dashboard-mobile',
    label: 'Home',
    path: '/dashboard',
    icon: Home,
  },
  {
    id: 'search-mobile',
    label: 'Search',
    path: '/search',
    icon: Search,
  },
  {
    id: 'editor-mobile',
    label: 'Create',
    path: '/editor',
    icon: Plus,
    quickAction: true,
  },
  {
    id: 'knowledge-mobile',
    label: 'Docs',
    path: '/knowledge',
    icon: FileText,
  },
  {
    id: 'profile-mobile',
    label: 'Profile',
    path: '/profile',
    icon: User,
  },
]

// Quick actions that appear in various places
export const quickActions = [
  {
    id: 'new-document',
    label: 'New Document',
    path: '/editor/new',
    icon: Plus,
    shortcut: 'Cmd+N',
  },
  {
    id: 'quick-search',
    label: 'Quick Search',
    path: '/search',
    icon: Search,
    shortcut: 'Cmd+K',
  },
]

// Utility function to get all navigation items
export function getAllNavigationItems(): NavItem[] {
  const allItems: NavItem[] = []

  const addItems = (items: NavItem[]) => {
    items.forEach(item => {
      allItems.push(item)
      if (item.children) {
        addItems(item.children)
      }
    })
  }

  addItems(primaryNavigation)
  addItems(secondaryNavigation)
  addItems(headerNavigation)

  return allItems
}

// Get navigation item by path
export function getNavigationByPath(path: string): NavItem | undefined {
  const allItems = getAllNavigationItems()
  return allItems.find(item => item.path === path)
}

// Get breadcrumbs for a given path
export function getBreadcrumbs(path: string): NavItem[] {
  const breadcrumbs: NavItem[] = []
  const allItems = getAllNavigationItems()

  // Find the current item
  const currentItem = allItems.find(item => item.path === path)
  if (!currentItem) return breadcrumbs

  // Build breadcrumb trail
  const findParent = (items: NavItem[], target: NavItem): NavItem | null => {
    for (const item of items) {
      if (item.children?.some(child => child.id === target.id)) {
        return item
      }
      if (item.children) {
        const parent = findParent(item.children, target)
        if (parent) return parent
      }
    }
    return null
  }

  // Add current item
  breadcrumbs.unshift(currentItem)

  // Find and add parents
  let parent = findParent([...primaryNavigation, ...secondaryNavigation], currentItem)
  while (parent) {
    breadcrumbs.unshift(parent)
    parent = findParent([...primaryNavigation, ...secondaryNavigation], parent)
  }

  // Always add dashboard as root if not already there
  if (breadcrumbs[0]?.id !== 'dashboard' && path !== '/dashboard') {
    breadcrumbs.unshift(primaryNavigation[0]) // Dashboard
  }

  return breadcrumbs
}
