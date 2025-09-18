import * as React from 'react'
export default function Link(props: any) {
  const { href, children, ...rest } = props
  return (
    <a href={typeof href === 'string' ? href : '#'} {...rest}>
      {children}
    </a>
  )
}

