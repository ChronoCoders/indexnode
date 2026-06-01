export const metadata = { title: "Disclaimer" };

export default function DisclaimerPage() {
  return (
    <section className="prose prose-invert mx-auto max-w-3xl px-6 py-24">
      <h1>Disclaimer</h1>
      <p className="text-sm text-gray-500">Last updated: May 21, 2026</p>

      <p>
        IndexNode is a developer tool for indexing blockchain data. The notes
        below clarify the nature and limits of the service.
      </p>

      <h2>Blockchain data accuracy</h2>
      <p>
        We index the events that smart contracts emit and the transactions
        that nodes report. Our role is to record those faithfully, hash them,
        and commit the resulting Merkle roots on-chain so you can verify them
        later. We do not validate the economic meaning of what a contract
        emits, and we are not responsible for:
      </p>
      <ul>
        <li>Reorganizations, reverts, or finality changes on the underlying chain.</li>
        <li>Bugs, malicious behavior, or upgrade decisions in the contracts you index.</li>
        <li>RPC providers that return incomplete or stale data.</li>
        <li>Forks, downtime, or consensus failures of the underlying network.</li>
      </ul>
      <p>
        Every indexed event is content-addressed, so you can independently
        verify what we observed at the time of indexing.
      </p>

      <h2>Not financial, legal, or tax advice</h2>
      <p>
        Nothing on this site or in the platform&apos;s outputs is financial,
        investment, legal, accounting, or tax advice. Smart contracts,
        protocols, and tokens we index may be high-risk, illiquid, or
        unregulated. You are solely responsible for due diligence on anything
        you build using indexed data, and for compliance with your local
        rules. If you need professional advice, consult a qualified
        professional.
      </p>

      <h2>AI extraction outputs</h2>
      <p>
        Optional AI extraction features turn raw event data into structured
        fields. AI outputs can be wrong, incomplete, or biased. Treat them as
        a hypothesis, not a fact. Always reconcile against the underlying
        event before acting on extraction output.
      </p>

      <h2>Pre-production status</h2>
      <p>
        IndexNode is under active development. Features, schemas, and pricing
        may change. We may rotate breaking-change notices through release
        notes; subscribe to the changelog if you need advance warning. Until
        we publish a general-availability notice, treat the platform as
        suitable for evaluation, prototyping, and non-critical production
        workloads.
      </p>

      <h2>Service availability</h2>
      <p>
        We operate the service on a <strong>best-effort</strong> basis and do
        not currently offer a contractual uptime SLA. Maintenance, RPC
        outages, gas-market spikes, and chain-level events can affect
        availability. If you require a contractual SLA for a production
        workload, contact us at{" "}
        <a href="mailto:sales@indexnode.io">sales@indexnode.io</a>.
      </p>

      <h2>No endorsement</h2>
      <p>
        Mentions of specific blockchains, contracts, protocols, projects, or
        organizations on the site or in documentation are for illustration
        only and do not imply endorsement.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this disclaimer:{" "}
        <a href="mailto:legal@indexnode.io">legal@indexnode.io</a>
      </p>
    </section>
  );
}
