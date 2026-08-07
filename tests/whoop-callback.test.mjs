import test from 'node:test'
import assert from 'node:assert/strict'
import { appUrl } from '../netlify/functions/whoop-callback.mjs'

const originalDeployPrimeUrl = process.env.DEPLOY_PRIME_URL
const originalUrl = process.env.URL

test.afterEach(() => {
  if (originalDeployPrimeUrl === undefined) delete process.env.DEPLOY_PRIME_URL
  else process.env.DEPLOY_PRIME_URL = originalDeployPrimeUrl
  if (originalUrl === undefined) delete process.env.URL
  else process.env.URL = originalUrl
})

test('uses the request origin when Netlify URL variables are unavailable', () => {
  delete process.env.DEPLOY_PRIME_URL
  delete process.env.URL
  assert.equal(appUrl(new Request('http://localhost:8888/.netlify/functions/whoop-callback')), 'http://localhost:8888/app')
})

test('prefers the deploy preview URL and removes its trailing slash', () => {
  process.env.DEPLOY_PRIME_URL = 'https://deploy-preview-42--zcore.netlify.app/'
  process.env.URL = 'https://zcore.health'
  assert.equal(appUrl(new Request('https://zcore.health/.netlify/functions/whoop-callback')), 'https://deploy-preview-42--zcore.netlify.app/app')
})

test('uses the site URL when there is no deploy-specific URL', () => {
  delete process.env.DEPLOY_PRIME_URL
  process.env.URL = 'https://zcore.health'
  assert.equal(appUrl(new Request('http://localhost:8888/.netlify/functions/whoop-callback')), 'https://zcore.health/app')
})
