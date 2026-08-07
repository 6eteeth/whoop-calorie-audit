import {
  AboutPage,
  ConsistencyPage,
  ContactPage,
  LandingPage,
  LearningPage,
  PrivacyPage,
  TermsPage,
} from './PublicPages'

export default function PublicRoute({ path }) {
  if (path === '/about') return <AboutPage />
  if (path === '/consistency') return <ConsistencyPage />
  if (path === '/learning') return <LearningPage />
  if (path === '/privacy') return <PrivacyPage />
  if (path === '/terms') return <TermsPage />
  if (path === '/contact') return <ContactPage />
  return <LandingPage />
}
