export const metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <section className="prose prose-invert mx-auto max-w-3xl px-6 py-24">
      <h1>Privacy policy</h1>
      <p className="text-sm text-gray-500">Last updated: May 21, 2026</p>

      <p>
        IndexNode (&ldquo;IndexNode&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;)
        provides infrastructure for indexing blockchain data. This policy
        explains what personal data we collect when you use the service, why
        we collect it, and the choices you have. We aim for plain language —
        if anything is unclear, email{" "}
        <a href="mailto:privacy@indexnode.io">privacy@indexnode.io</a>.
      </p>

      <h2>What we collect</h2>
      <p>To run the service, we store the following on our infrastructure:</p>
      <ul>
        <li>
          <strong>Account data.</strong> Your email address and a one-way bcrypt
          hash of your password. We never store your password in plain text and
          we cannot recover it.
        </li>
        <li>
          <strong>Wallet address (optional).</strong> If you connect a wallet to
          purchase or spend INC credits, we store the public address you
          authorize. We never request or store private keys.
        </li>
        <li>
          <strong>Usage data.</strong> Job configurations you submit (contract
          addresses, chain IDs, event signatures, block ranges) and the
          blockchain events those jobs index. Indexed events are public
          on-chain data; we store them to serve them back to you efficiently.
        </li>
        <li>
          <strong>API keys and webhooks.</strong> Names, key prefixes, hashed
          secrets, target URLs, and the events you&apos;ve subscribed to.
        </li>
        <li>
          <strong>Operational logs.</strong> Request metadata (timestamps, IP
          addresses, status codes) for security monitoring, debugging, and
          rate limiting.
        </li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To authenticate you and operate your account.</li>
        <li>
          To run the jobs you submit, store the resulting indexed data, and
          deliver it to you over our API and webhooks.
        </li>
        <li>
          To meter credit balances, prevent abuse, and protect the service from
          unauthorized access.
        </li>
        <li>
          To respond to support requests and send transactional notices
          (security alerts, password resets, service incidents).
        </li>
      </ul>
      <p>
        We do <strong>not</strong> sell your data, share it with advertisers,
        or use it to train third-party models. We do not run any third-party
        advertising or tracking pixels on the IndexNode product.
      </p>

      <h2>Data retention and deletion</h2>
      <p>
        Account data is retained for the lifetime of your account. Indexed
        blockchain events are retained for as long as the underlying job
        remains in your account. If you delete your account, we erase your
        account profile, API keys, webhooks, and job records within 30 days,
        and operational logs containing your data within 90 days. Backups roll
        off on their normal schedule (no longer than 90 days). On-chain Merkle
        commitments we&apos;ve already published cannot be deleted — they are
        public chain state.
      </p>

      <h2>Cookies</h2>
      <p>
        We set a single HttpOnly authentication cookie (<code>auth_token</code>)
        and a companion non-sensitive marker cookie (<code>auth_present</code>)
        that lets the UI know you&apos;re signed in. We do not set tracking,
        analytics, or advertising cookies. Both cookies are first-party and
        scoped to the IndexNode domain.
      </p>

      <h2>Your rights (GDPR / UK GDPR / CCPA)</h2>
      <p>
        If you&apos;re in the EEA, the UK, or California, you have the right to:
      </p>
      <ul>
        <li>
          <strong>Access</strong> the personal data we hold about you.
        </li>
        <li>
          <strong>Rectify</strong> inaccurate data.
        </li>
        <li>
          <strong>Erase</strong> your data (subject to the on-chain caveat
          above).
        </li>
        <li>
          <strong>Port</strong> your data in a machine-readable format.
        </li>
        <li>
          <strong>Object</strong> to specific processing and{" "}
          <strong>withdraw consent</strong> where processing is consent-based.
        </li>
      </ul>
      <p>
        To exercise any of these rights, email{" "}
        <a href="mailto:privacy@indexnode.io">privacy@indexnode.io</a> from the
        address on your account. We respond within 30 days.
      </p>

      <h2>Subprocessors</h2>
      <p>
        We use a small number of vendors to run the service — cloud hosting,
        IPFS pinning, transactional email, and (optionally) AI extraction. A
        current list is available on request.
      </p>

      <h2>Children</h2>
      <p>
        IndexNode is a developer tool. We do not knowingly collect data from
        children under 16. If you believe a minor has signed up, email us and
        we will delete the account.
      </p>

      <h2>Changes</h2>
      <p>
        If we make a material change to this policy, we will notify account
        holders by email at least 14 days before it takes effect.
      </p>

      <h2>Contact</h2>
      <p>
        <a href="mailto:privacy@indexnode.io">privacy@indexnode.io</a>
      </p>
    </section>
  );
}
