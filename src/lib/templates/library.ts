import { TemplateDefinition } from './types'

const now = new Date().toISOString()

export const builtinTemplates: TemplateDefinition[] = [
  {
    id: 'tech-doc-v1',
    name: 'Technical Documentation',
    description: 'Structure for feature/architecture/ADR docs with metadata.',
    category: 'documentation',
    keywords: ['architecture', 'adr', 'technical'],
    version: '1.0.0',
    visibility: 'workspace',
    createdAt: now,
    updatedAt: now,
    changelog: ['Initial version'],
    variables: [
      { key: 'title', label: 'Title', type: 'string', required: true },
      { key: 'author', label: 'Author', type: 'user', required: true },
      { key: 'workspace', label: 'Workspace', type: 'workspace' },
      { key: 'date', label: 'Date', type: 'date', defaultValue: now },
      { key: 'summary', label: 'Summary', type: 'string' },
    ],
    content: `# {{ title }}

- Author: {{ author | quotes }}
- Workspace: {{ workspace | quotes }}
- Date: {{ date | date('YYYY-MM-DD') }}

## Summary

{{ summary }}

## Context

Describe the background and context.

## Decision

Document the decision, including trade-offs.

## Consequences

List positive and negative consequences.
`,
  },
  {
    id: 'meeting-notes-v1',
    name: 'Meeting Notes',
    description: 'Agenda, attendees, notes, and actions.',
    category: 'meeting',
    keywords: ['meeting', 'notes'],
    version: '1.0.0',
    visibility: 'workspace',
    createdAt: now,
    updatedAt: now,
    variables: [
      { key: 'title', label: 'Meeting Title', type: 'string', required: true },
      { key: 'date', label: 'Date', type: 'date', defaultValue: now },
      { key: 'attendees', label: 'Attendees', type: 'string' },
    ],
    content: `# {{ title }} — {{ date | date('YYYY-MM-DD') }}

## Attendees

- {{ attendees }}

## Agenda

1. 
2. 
3. 

## Notes

- 

## Action Items

- [ ] Owner — Task (due: {{ date | date('YYYY-MM-DD') }})
`,
  },
  {
    id: 'retro-v1',
    name: 'Project Retrospective',
    description: 'Start/Stop/Continue with metrics and outcomes.',
    category: 'process',
    keywords: ['retrospective', 'process'],
    version: '1.0.0',
    visibility: 'workspace',
    createdAt: now,
    updatedAt: now,
    variables: [
      { key: 'title', label: 'Retro Title', type: 'string', required: true },
      { key: 'sprint', label: 'Sprint/Period', type: 'string' },
      { key: 'metrics', label: 'Key Metrics', type: 'string' },
    ],
    content: `# {{ title }} — {{ sprint }}

## What Went Well 👍

- 

## What Didn’t Go Well 👎

- 

## Start

- 

## Stop

- 

## Continue

- 

## Metrics

{{ metrics }}
`,
  },
  {
    id: 'research-findings-v1',
    name: 'Research Findings',
    description: 'Hypothesis, method, results, and conclusions.',
    category: 'research',
    keywords: ['research'],
    version: '1.0.0',
    visibility: 'workspace',
    createdAt: now,
    updatedAt: now,
    variables: [
      { key: 'title', label: 'Title', type: 'string', required: true },
      { key: 'hypothesis', label: 'Hypothesis', type: 'string' },
      { key: 'method', label: 'Method', type: 'string' },
    ],
    content: `# {{ title }}

## Hypothesis

{{ hypothesis }}

## Method

{{ method }}

## Results

- 

## Conclusion

- 
`,
  },
  {
    id: 'best-practices-v1',
    name: 'Best Practices Guide',
    description: 'Guidelines and anti-patterns for a topic.',
    category: 'guides',
    keywords: ['best-practices', 'guide'],
    version: '1.0.0',
    visibility: 'public',
    createdAt: now,
    updatedAt: now,
    variables: [
      { key: 'topic', label: 'Topic', type: 'string', required: true },
    ],
    content: `# {{ topic | upper }} — Best Practices

## Principles

- 

## Recommended Patterns

- 

## Anti-Patterns

- 
`,
  },
  {
    id: 'troubleshooting-v1',
    name: 'Troubleshooting Guide',
    description: 'Symptoms, diagnosis steps, and fixes.',
    category: 'guides',
    keywords: ['troubleshooting'],
    version: '1.0.0',
    visibility: 'public',
    createdAt: now,
    updatedAt: now,
    variables: [
      { key: 'system', label: 'System', type: 'string', required: true },
      { key: 'owner', label: 'Owner', type: 'user' },
    ],
    content: `# {{ system }} — Troubleshooting Guide

## Symptoms

- 

## Diagnostics

1. 
2. 
3. 

## Fixes

- 

## Ownership

Owned by: {{ owner }}
`,
  },
]

export function getBuiltinTemplateById(id: string) {
  return builtinTemplates.find((t) => t.id === id)
}

