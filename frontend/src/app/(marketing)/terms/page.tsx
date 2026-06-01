export const metadata = { title: "Terms of service" };

export default function TermsPage() {
  return (
    <section className="prose prose-invert mx-auto max-w-3xl px-6 py-24">
      <h1>Terms of service</h1>
      <p className="text-sm text-gray-500">Last updated: May 21, 2026</p>

      <p>
        These Terms govern your use of the IndexNode platform and APIs. By
        creating an account or using the service, you agree to be bound by
        them. If you don&apos;t agree, don&apos;t use the service.
      </p>

      <h2>1. Service description</h2>
      <p>
        IndexNode is a hosted platform for indexing blockchain data,
        committing content-addressed proofs of that data on-chain, and
        delivering it to your applications via REST, GraphQL, WebSocket, and
        webhook integrations. Features and limits may change over time; we
        will give reasonable notice of material reductions.
      </p>

      <h2>2. Eligibility and accounts</h2>
      <p>
        You must be at least 18 years old and able to enter into a binding
        contract. You are responsible for:
      </p>
      <ul>
        <li>Keeping your password, API keys, and webhook secrets confidential.</li>
        <li>All activity that occurs under your account or API keys.</li>
        <li>Notifying us immediately if you suspect a credential is compromised.</li>
        <li>
          Holding a single account per natural person or legal entity. Sharing
          credentials across organizations is not permitted; create separate
          accounts and use distinct API keys.
        </li>
      </ul>

      <h2>3. Credits and payment</h2>
      <p>
        Some actions on the platform require IndexNode Credits (INC). Credits
        are consumed at the time a job is created — the cost is deducted
        atomically from your balance and is not refundable, including for jobs
        that you later cancel or that fail due to your input (invalid
        addresses, missing events, unreachable RPCs, etc.). If we cause the
        failure due to a verified outage on our side, we will credit your
        balance back.
      </p>
      <p>
        Credit balances do not expire while your account is active. Credits
        have no cash value and cannot be exchanged for fiat outside the
        platform.
      </p>

      <h2>4. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>
          Use the service to violate any law, sanction, or third-party right,
          including intellectual property, privacy, or contract rights.
        </li>
        <li>
          Attempt to gain unauthorized access to the platform, other
          accounts, or any underlying infrastructure.
        </li>
        <li>
          Scrape, index, or extract data that is not publicly accessible on a
          blockchain or that you do not have a lawful right to process.
        </li>
        <li>
          Submit jobs designed to overwhelm the service, evade rate limits, or
          mask the source of traffic.
        </li>
        <li>
          Resell raw access to the platform without a separate written
          agreement with us.
        </li>
        <li>
          Use the service to support activity prohibited under U.S., EU, or UK
          export control or sanctions regimes.
        </li>
      </ul>
      <p>
        We may suspend or terminate accounts that violate this section without
        notice when needed to protect the platform or other users.
      </p>

      <h2>5. Intellectual property and licensing</h2>
      <p>
        The IndexNode platform, including its source code, documentation, and
        assets, is the proprietary property of Distributed Systems Labs, LLC
        and is distributed under an <strong>All Rights Reserved</strong>
        license. No license, express or implied, is granted to copy, modify,
        redistribute, sublicense, host, or create derivative works from any
        part of the software except as expressly permitted in writing by the
        copyright holder. Source visibility for evaluation does not constitute
        a grant of any other right.
      </p>
      <p>
        You retain ownership of the inputs you submit (job configurations,
        wallet addresses) and of the on-chain data those jobs index. We claim
        no ownership over your data. You grant us a non-exclusive license to
        process that data solely as needed to operate the service for you.
      </p>

      <h2>6. Service availability</h2>
      <p>
        We aim for high availability but currently do not offer a contractual
        SLA. Scheduled maintenance windows will be announced where possible.
        Indexing progress depends on the underlying blockchain RPC endpoints
        and gas market conditions; delays at the chain level are outside our
        control.
      </p>

      <h2>7. Disclaimers</h2>
      <p>
        The service is provided <strong>&ldquo;as is&rdquo;</strong> and{" "}
        <strong>&ldquo;as available&rdquo;</strong>. To the maximum extent
        permitted by law, we disclaim all warranties — express, implied, or
        statutory — including merchantability, fitness for a particular
        purpose, non-infringement, and any warranty arising from course of
        dealing or usage of trade. We do not warrant that indexed data, AI
        extractions, or on-chain commitments are error-free.
      </p>

      <h2>8. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, IndexNode will not be liable
        for any indirect, incidental, special, consequential, exemplary, or
        punitive damages, including lost profits, lost revenue, lost data, or
        business interruption, even if we have been advised of the
        possibility. Our aggregate liability for any claim related to the
        service will not exceed the greater of (a) the amount you paid us in
        the 12 months preceding the event giving rise to the claim, or (b) USD
        100.
      </p>

      <h2>9. Indemnification</h2>
      <p>
        You agree to indemnify and hold IndexNode and its operators harmless
        from any claim arising out of your misuse of the service, your
        violation of these Terms, or your violation of any law or third-party
        right.
      </p>

      <h2>10. Termination</h2>
      <p>
        You may close your account at any time from the Account page or by
        emailing support. We may suspend or terminate your account if you
        materially breach these Terms, if continued operation creates legal or
        operational risk, or if your account is inactive for 24 months.
        Sections that by their nature should survive termination (IP,
        disclaimers, limitations of liability, indemnification, governing law)
        will survive.
      </p>

      <h2>11. Changes to these Terms</h2>
      <p>
        We may update these Terms from time to time. Material changes will be
        announced to account holders by email at least 14 days before they
        take effect. Continued use after the effective date constitutes
        acceptance.
      </p>

      <h2>12. Governing law and venue</h2>
      <p>
        These Terms are governed by the laws of the State of Delaware, USA,
        without regard to its conflict-of-laws rules. Any dispute will be
        resolved in the state or federal courts located in Delaware, and you
        consent to personal jurisdiction there.
      </p>

      <h2>13. Contact</h2>
      <p>
        <a href="mailto:legal@indexnode.io">legal@indexnode.io</a>
      </p>
    </section>
  );
}
