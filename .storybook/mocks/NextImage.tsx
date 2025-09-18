import * as React from 'react'
// Minimal next/image mock for Storybook
// eslint-disable-next-line @next/next/no-img-element
export default function Image(props: any) {
  const { src, alt, width, height, style, ...rest } = props
  const resolved = typeof src === 'string' ? src : (src?.src || '')
  return <img src={resolved} alt={alt || ''} width={width} height={height} style={style} {...rest} />
}

