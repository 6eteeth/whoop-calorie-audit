export function go(path) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function Link({ href, children, className = '' }) {
  return <a className={className} href={href} onClick={event => {
    if (href.startsWith('/')) {
      event.preventDefault()
      go(href)
    }
  }}>{children}</a>
}

export function Brand({ compact = false }) {
  return <Link href="/" className={`brand ${compact ? 'compact' : ''}`}>
    <img src="/zcore-mark.png" alt="ZCore" />
    <span><strong>ZCore</strong>{!compact && <small>Personal Metabolic Intelligence</small>}</span>
  </Link>
}
