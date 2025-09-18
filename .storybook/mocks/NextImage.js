const Image = (props) => {
  const { src, alt = '', ...rest } = props
  const resolved = typeof src === 'string' ? src : (src && src.src) ? src.src : ''
  // eslint-disable-next-line jsx-a11y/alt-text
  return <img src={resolved} alt={alt} {...rest} />
}

export default Image
