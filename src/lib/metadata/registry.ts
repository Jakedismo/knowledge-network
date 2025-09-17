import type { MetadataFieldDefinition } from '@/components/organization/types'

// Minimal client-side registry to provide metadata schemas per knowledge type.
// In a future phase this should be fetched from the backend (per workspace/type).

const defaultFields: MetadataFieldDefinition[] = [
  { name: 'owner', label: 'Owner', type: 'text' },
  { name: 'priority', label: 'Priority', type: 'select', options: [ { label: 'Low', value: 'low' }, { label: 'High', value: 'high' } ] },
  { name: 'reviewed', label: 'Reviewed', type: 'boolean' },
]

const registry: Record<string, MetadataFieldDefinition[]> = {
  doc: defaultFields,
  spec: [
    { name: 'owner', label: 'Owner', type: 'text' },
    { name: 'status', label: 'Status', type: 'select', options: [ { label: 'Draft', value: 'draft' }, { label: 'Review', value: 'review' }, { label: 'Approved', value: 'approved' } ] },
    { name: 'component', label: 'Component', type: 'text' },
    { name: 'reviewed', label: 'Reviewed', type: 'boolean' },
  ],
}

export function getSchemaFieldsForKnowledge(kind?: string): MetadataFieldDefinition[] {
  if (!kind) return defaultFields
  return registry[kind] ?? defaultFields
}

