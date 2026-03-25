/**
 * IndexNode JavaScript SDK
 *
 * Lightweight ES-module client for the IndexNode API.
 * Works in Node.js 18+ and modern browsers.
 *
 * @example
 * import { IndexNodeClient } from './sdk/indexnode.js';
 *
 * const client = new IndexNodeClient({ baseUrl: 'https://api.indexnode.io' });
 * await client.login('me@example.com', 'password');
 * const job = await client.createCrawlJob({ url: 'https://example.com' });
 */

export class IndexNodeClient {
  /**
   * @param {object} opts
   * @param {string} opts.baseUrl   - Base URL of the IndexNode API (no trailing slash)
   * @param {string} [opts.token]   - Bearer token (JWT or API key starting with ink_)
   */
  constructor({ baseUrl, token } = {}) {
    this._base = (baseUrl ?? '').replace(/\/$/, '');
    this._token = token ?? null;
  }

  // ── Internal helpers ──────────────────────────────────────────────────────

  _headers(extra = {}) {
    const headers = { 'Content-Type': 'application/json', ...extra };
    if (this._token) headers['Authorization'] = `Bearer ${this._token}`;
    return headers;
  }

  async _request(method, path, body) {
    const res = await fetch(`${this._base}${path}`, {
      method,
      headers: this._headers(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (res.status === 204) return null;
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { message: text }; }
    if (!res.ok) {
      const err = new Error(json?.message ?? `HTTP ${res.status}`);
      err.status = res.status;
      err.body = json;
      throw err;
    }
    return json;
  }

  _get(path)        { return this._request('GET',    path); }
  _post(path, body) { return this._request('POST',   path, body); }
  _del(path)        { return this._request('DELETE', path); }

  // ── Authentication ────────────────────────────────────────────────────────

  /**
   * Register a new account. Returns { token, user_id }.
   */
  async register(email, password) {
    const data = await this._post('/api/v1/auth/register', { email, password });
    this._token = data.token;
    return data;
  }

  /**
   * Log in with email + password. Stores the JWT for subsequent calls.
   * Returns { token, user_id }.
   */
  async login(email, password) {
    const data = await this._post('/api/v1/auth/login', { email, password });
    this._token = data.token;
    return data;
  }

  /**
   * Set the auth token explicitly (JWT or API key).
   */
  setToken(token) {
    this._token = token;
  }

  /**
   * Send a password-reset email for the given address.
   */
  forgotPassword(email) {
    return this._post('/api/v1/auth/forgot-password', { email });
  }

  /**
   * Complete a password reset using the token from the email link.
   */
  resetPassword(token, newPassword) {
    return this._post('/api/v1/auth/reset-password', { token, new_password: newPassword });
  }

  // ── API Keys ──────────────────────────────────────────────────────────────

  /**
   * Create an API key. Returns { id, key, name, key_prefix, created_at, expires_at }.
   * `key` is the raw secret — store it securely; it is returned only once.
   *
   * @param {string} name             - Human-readable label for the key
   * @param {number} [expiresInDays]  - Validity in days; omit for a non-expiring key
   */
  createApiKey(name, expiresInDays) {
    return this._post('/api/v1/api-keys', {
      name,
      ...(expiresInDays !== undefined ? { expires_in_days: expiresInDays } : {}),
    });
  }

  /**
   * List all API keys for the authenticated user (raw keys not included).
   * Returns [{ id, name, key_prefix, last_used_at, created_at, expires_at }]
   */
  listApiKeys() {
    return this._get('/api/v1/api-keys');
  }

  /**
   * Delete an API key by ID.
   */
  deleteApiKey(id) {
    return this._del(`/api/v1/api-keys/${id}`);
  }

  // ── Webhooks ──────────────────────────────────────────────────────────────

  /**
   * Register a webhook endpoint.
   * Returns { id, url, secret, events, created_at }.
   * `secret` is the HMAC signing secret — store it securely; returned only once.
   *
   * @param {string}   url              - HTTPS endpoint that will receive events
   * @param {string[]} [events]         - Defaults to ['job.completed', 'job.failed']
   */
  createWebhook(url, events) {
    return this._post('/api/v1/webhooks', {
      url,
      ...(events ? { events } : {}),
    });
  }

  /**
   * List all webhook subscriptions for the authenticated user.
   * Returns [{ id, url, events, is_active, created_at }]
   */
  listWebhooks() {
    return this._get('/api/v1/webhooks');
  }

  /**
   * Delete a webhook subscription by ID.
   */
  deleteWebhook(id) {
    return this._del(`/api/v1/webhooks/${id}`);
  }

  // ── Jobs ──────────────────────────────────────────────────────────────────

  /**
   * Create an HTTP crawl job. Returns { id, status }.
   *
   * @param {object} params
   * @param {string} params.url        - URL to crawl
   * @param {number} [params.maxPages] - Maximum number of linked pages to follow
   */
  createCrawlJob({ url, maxPages } = {}) {
    return this._post('/api/v1/jobs', {
      job_type: 'http_crawl',
      params: { url, ...(maxPages !== undefined ? { max_pages: maxPages } : {}) },
    });
  }

  /**
   * Get a job by ID. Returns { id, status }.
   */
  getJob(id) {
    return this._get(`/api/v1/jobs/${id}`);
  }

  /**
   * Poll a job until it reaches a terminal state (completed or failed).
   * Returns the final job object.
   *
   * @param {string} id             - Job ID
   * @param {object} [opts]
   * @param {number} [opts.intervalMs=3000] - Polling interval in milliseconds
   * @param {number} [opts.timeoutMs=300000] - Maximum wait in milliseconds
   */
  async waitForJob(id, { intervalMs = 3000, timeoutMs = 300_000 } = {}) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const job = await this.getJob(id);
      if (job.status === 'completed' || job.status === 'failed') return job;
      await new Promise(r => setTimeout(r, intervalMs));
    }
    throw new Error(`Job ${id} did not complete within ${timeoutMs}ms`);
  }

  // ── Verification ──────────────────────────────────────────────────────────

  /**
   * Verify a content hash against on-chain Merkle commitments.
   * Returns { verified, block_number, transaction_hash, committed_at }.
   */
  verifyHash(contentHash) {
    return this._post('/api/v1/verify', { content_hash: contentHash });
  }

  // ── GraphQL ───────────────────────────────────────────────────────────────

  /**
   * Execute a raw GraphQL query or mutation against the /graphql endpoint.
   *
   * @param {string} query      - GraphQL document string
   * @param {object} [variables]
   * @returns {Promise<object>} - The `data` field from the GraphQL response
   */
  async graphql(query, variables = {}) {
    const res = await fetch(`${this._base}/graphql`, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify({ query, variables }),
    });
    const json = await res.json();
    if (json.errors?.length) {
      const err = new Error(json.errors[0].message);
      err.graphqlErrors = json.errors;
      throw err;
    }
    return json.data;
  }

  // ── Health ────────────────────────────────────────────────────────────────

  /** Returns the raw health response { status, timestamp }. */
  health() {
    return this._get('/health');
  }
}

/**
 * Verify an incoming webhook request using HMAC-SHA256.
 * Works in Node.js 18+ (Web Crypto API).
 *
 * @param {string} secret       - The whsec_... signing secret for this subscription
 * @param {string} signature    - Value of the X-IndexNode-Signature header (sha256=<hex>)
 * @param {string|Uint8Array} body - Raw request body
 * @returns {Promise<boolean>}
 */
export async function verifyWebhookSignature(secret, signature, body) {
  const enc = new TextEncoder();
  const keyData = enc.encode(secret);
  const message = typeof body === 'string' ? enc.encode(body) : body;

  const key = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sigBytes = await crypto.subtle.sign('HMAC', key, message);
  const computed = 'sha256=' + Array.from(new Uint8Array(sigBytes))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  // Constant-time comparison to prevent timing attacks.
  if (computed.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}
