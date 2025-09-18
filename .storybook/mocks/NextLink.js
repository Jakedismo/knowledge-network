const Link = ({ href = '#', children, ...rest }) => (
  <a href={typeof href === 'string' ? href : '#'} {...rest}>
    {children}
  </a>
)

export default Link
