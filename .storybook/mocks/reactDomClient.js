module.exports = {
  createRoot(container) {
    return {
      render(node) {
        if (container) {
          container.innerHTML = ''
          if (node && typeof node === 'string') {
            container.innerHTML = node
          }
        }
      },
      unmount() {},
    }
  },
}
