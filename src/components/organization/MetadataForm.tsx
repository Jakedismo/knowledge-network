"use client"
import * as React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Checkbox, Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, Input, Select, Textarea } from '@/components/ui'
import type { MetadataFieldDefinition, MetadataValues } from './types'
import { cn } from '@/lib/utils'

export interface MetadataFormProps {
  fields: MetadataFieldDefinition[]
  values?: MetadataValues
  onChange?: (values: MetadataValues) => void
  onSubmit?: (values: MetadataValues) => void
  className?: string
  submitLabel?: string
}

function fieldToSchema(field: MetadataFieldDefinition): z.ZodTypeAny {
  const baseOptional = (s: z.ZodTypeAny) => (field.required ? s : s.optional())
  switch (field.type) {
    case 'text':
      return baseOptional(z.string())
    case 'number':
      return baseOptional(z.number().or(z.string().transform((v) => (v === '' ? undefined : Number(v))))).refine((v) => v === undefined || typeof v === 'number' && !Number.isNaN(v), { message: 'Must be a number' })
    case 'boolean':
      return baseOptional(z.boolean())
    case 'date':
      return baseOptional(z.string())
    case 'select':
      return baseOptional(z.string())
    case 'multiselect':
      return baseOptional(z.array(z.string()))
    case 'url':
      return baseOptional(z.string().url())
    default:
      return z.any()
  }
}

export function MetadataForm({ fields, values, onChange, onSubmit, className, submitLabel = 'Save' }: MetadataFormProps) {
  const schema = React.useMemo(() => z.object(Object.fromEntries(fields.map(f => [f.name, fieldToSchema(f)]))), [fields])
  const form = useForm<MetadataValues>({
    resolver: zodResolver(schema as any),
    defaultValues: values,
    mode: 'onChange',
  })

  React.useEffect(() => {
    const sub = form.watch((v) => {
      onChange?.(v as MetadataValues)
    })
    return () => sub.unsubscribe()
  }, [form, onChange])

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((v) => onSubmit?.(v))} className={cn('space-y-4', className)}>
        {fields.map((field) => (
          <FormField
            key={field.name}
            control={form.control}
            name={field.name as any}
            render={({ field: rhf }) => (
              <FormItem>
                <FormLabel>{field.label}{field.required && <span aria-hidden className="text-destructive"> *</span>}</FormLabel>
                <FormControl>
                  {(() => {
                    switch (field.type) {
                      case 'text':
                        return <Input placeholder={field.placeholder} value={(rhf.value as string | undefined) ?? ''} onChange={rhf.onChange} />
                      case 'number':
                        return <Input type="number" inputMode="numeric" value={(rhf.value as number | string | undefined) as any} onChange={rhf.onChange} />
                      case 'boolean':
                        return <Checkbox checked={!!rhf.value} onCheckedChange={(v) => rhf.onChange(Boolean(v))} />
                      case 'date':
                        return <Input type="date" value={(rhf.value as string | undefined) ?? ''} onChange={rhf.onChange} />
                      case 'url':
                        return <Input type="url" placeholder="https://" value={(rhf.value as string | undefined) ?? ''} onChange={rhf.onChange} />
                      case 'select': {
                        const selectProps: any = {
                          onValueChange: rhf.onChange,
                          options: (field.options ?? []).map(o => ({ label: o.label, value: o.value })),
                        }
                        if (typeof rhf.value === 'string') selectProps.value = rhf.value
                        return <Select {...selectProps} />
                      }
                      case 'multiselect':
                        return (
                          <Textarea
                            placeholder={field.placeholder ?? 'Enter values separated by commas'}
                            value={Array.isArray(rhf.value) ? rhf.value.join(', ') : ''}
                            onChange={(e) => rhf.onChange(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                          />
                        )
                      default:
                        return <Input value={(rhf.value as string | undefined) ?? ''} onChange={rhf.onChange} />
                    }
                  })()}
                </FormControl>
                {field.description && <FormDescription>{field.description}</FormDescription>}
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
        {onSubmit && (
          <div className="pt-2">
            <Button type="submit">{submitLabel}</Button>
          </div>
        )}
      </form>
    </Form>
  )
}
