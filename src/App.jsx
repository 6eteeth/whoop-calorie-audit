import { lazy, Suspense, useEffect, useState } from 'react'

const AppArea = lazy(() => import('./components/AppArea'))
const PublicPages = lazy(() => import('./pages/PublicRoute'))

function Loading() {
  return <main className="auth-page"><div className="auth-card"><p>Loading ZCore…</p></div></main>
}

export default function App() {
  const [path, setPath] = useState(window.location.pathname)

  useEffect(() => {
    const update = () => setPath(window.location.pathname)
    window.addEventListener('popstate', update)
    return () => window.removeEventListener('popstate', update)
  }, [])

  const content = path === '/app' || path.startsWith('/app/')
    ? <AppArea />
    : <PublicPages path={path} />

  return <Suspense fallback={<Loading />}>{content}</Suspense>
}
