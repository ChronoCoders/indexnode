"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Boxes, Globe } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
} as const;

function Section({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      id={id}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.1 } },
      }}
      className="scroll-mt-24"
    >
      {children}
    </motion.section>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <motion.h2
      variants={fadeUp}
      className="text-2xl font-bold tracking-tight text-gray-100 sm:text-3xl"
    >
      {children}
    </motion.h2>
  );
}

function Lead({ children }: { children: React.ReactNode }) {
  return (
    <motion.p
      variants={fadeUp}
      className="mt-4 text-base leading-relaxed text-gray-400"
    >
      {children}
    </motion.p>
  );
}

function CodeBlock({
  language,
  code,
}: {
  language: string;
  code: string;
}) {
  return (
    <motion.div variants={fadeUp} className="mt-5">
      <div className="overflow-hidden rounded-lg border border-gray-800 bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-800 px-4 py-2">
          <span className="font-mono text-xs uppercase tracking-wider text-gray-500">
            {language}
          </span>
        </div>
        <pre className="overflow-x-auto p-4 font-mono text-sm leading-relaxed text-gray-200">
          <code>{code}</code>
        </pre>
      </div>
    </motion.div>
  );
}

interface TableRow {
  name: string;
  description: string;
}

function ReferenceTable({
  columns,
  rows,
}: {
  columns: [string, string];
  rows: TableRow[];
}) {
  return (
    <motion.div
      variants={fadeUp}
      className="mt-5 overflow-x-auto rounded-lg border border-gray-800"
    >
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead className="bg-gray-900/60">
          <tr>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              {columns[0]}
            </th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              {columns[1]}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={row.name}
              className={`border-t border-gray-800 ${
                idx % 2 === 1 ? "bg-gray-900/30" : ""
              }`}
            >
              <td className="px-4 py-3 font-mono text-xs text-amber-400">
                {row.name}
              </td>
              <td className="px-4 py-3 text-gray-300">{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
}

const graphQLQueries: TableRow[] = [
  { name: "myJobs", description: "List your indexing jobs" },
  {
    name: "blockchainEvents",
    description: "Query indexed events by contract",
  },
  { name: "walletInfo", description: "Get credit balance and wallet" },
  { name: "creditBalance", description: "Get current credit balance" },
];

const graphQLMutations: TableRow[] = [
  {
    name: "createBlockchainJob",
    description: "Start a new indexing job",
  },
  { name: "registerWallet", description: "Link an Ethereum wallet" },
  { name: "purchaseCredits", description: "Buy credits on-chain" },
  {
    name: "syncCreditBalance",
    description: "Sync on-chain balance to platform",
  },
];

interface RestRow {
  method: "GET" | "POST" | "DELETE";
  path: string;
  description: string;
}

const restEndpoints: RestRow[] = [
  {
    method: "POST",
    path: "/api/v1/auth/register",
    description: "Create account; sets auth cookie on success.",
  },
  {
    method: "POST",
    path: "/api/v1/auth/login",
    description: "Authenticate; sets HttpOnly auth_token cookie.",
  },
  {
    method: "POST",
    path: "/api/v1/auth/logout",
    description: "Clear auth cookies.",
  },
  {
    method: "POST",
    path: "/api/v1/auth/forgot-password",
    description: "Request a password-reset email.",
  },
  {
    method: "POST",
    path: "/api/v1/auth/reset-password",
    description: "Set a new password using a reset token.",
  },
  {
    method: "GET",
    path: "/api/v1/me",
    description: "Authenticated profile (email, role, created_at).",
  },
  {
    method: "POST",
    path: "/api/v1/jobs",
    description: "Submit a web crawl job. Costs 100 credits.",
  },
  {
    method: "GET",
    path: "/api/v1/jobs/{id}",
    description: "Job detail; scoped to the caller.",
  },
  {
    method: "GET",
    path: "/api/v1/api-keys",
    description: "List the caller's API keys.",
  },
  {
    method: "POST",
    path: "/api/v1/api-keys",
    description: "Create an API key; the raw value is returned once.",
  },
  {
    method: "DELETE",
    path: "/api/v1/api-keys/{id}",
    description: "Revoke an API key.",
  },
  {
    method: "GET",
    path: "/api/v1/webhooks",
    description: "List webhook subscriptions.",
  },
  {
    method: "POST",
    path: "/api/v1/webhooks",
    description: "Register a webhook for job.completed / job.failed events.",
  },
  {
    method: "DELETE",
    path: "/api/v1/webhooks/{id}",
    description: "Delete a webhook.",
  },
  {
    method: "POST",
    path: "/api/v1/verify",
    description: "Verify an event content hash against the on-chain proof.",
  },
  { method: "GET", path: "/health", description: "Liveness check." },
];

const methodToneClass: Record<RestRow["method"], string> = {
  GET: "bg-green-900/40 text-green-400",
  POST: "bg-amber-500/15 text-amber-400",
  DELETE: "bg-red-900/40 text-red-400",
};

function RestTable() {
  return (
    <motion.div
      variants={fadeUp}
      className="mt-5 overflow-x-auto rounded-lg border border-gray-800"
    >
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-gray-900/60">
          <tr>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Method
            </th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Path
            </th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Description
            </th>
          </tr>
        </thead>
        <tbody>
          {restEndpoints.map((row, idx) => (
            <tr
              key={`${row.method}-${row.path}`}
              className={`border-t border-gray-800 ${
                idx % 2 === 1 ? "bg-gray-900/30" : ""
              }`}
            >
              <td className="px-4 py-3">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 font-mono text-xs font-medium ${methodToneClass[row.method]}`}
                >
                  {row.method}
                </span>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-gray-200">
                {row.path}
              </td>
              <td className="px-4 py-3 text-sm text-gray-400">
                {row.description}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
}

const loginCurl = `# Login
curl -X POST https://indexnode.io/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email": "you@example.com", "password": "yourpassword"}'

# Using an API key
curl https://indexnode.io/graphql \\
  -H "Authorization: Bearer ink_your_api_key_here" \\
  -H "Content-Type: application/json"`;

const createJobCurl = `curl -X POST https://indexnode.io/graphql \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "mutation { createBlockchainJob(input: { chain: \\"ethereum\\", contractAddress: \\"0x...\\", events: [\\"Transfer(address,address,uint256)\\"], fromBlock: 19000000 }) { id status } }"
  }'`;

const createJobResponse = `{
  "data": {
    "createBlockchainJob": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "status": "queued"
    }
  }
}`;

const subscriptionExample = `subscription {
  blockchainEvents(contractAddress: "0x...") {
    eventName
    transactionHash
    blockNumber
    contentHash
    ipfsCid
  }
}`;

const verifyCurl = `curl -X POST https://indexnode.io/api/v1/verify \\
  -H "Content-Type: application/json" \\
  -d '{"content_hash": "a1b2c3d4..."}'`;

const verifyResponse = `{
  "verified": true,
  "block_number": 19847234,
  "transaction_hash": "0xabc123...",
  "committed_at": "2026-01-15T10:30:00Z"
}`;

export default function DocsContent() {
  return (
    <div className="mx-auto max-w-4xl space-y-24 px-6 pb-24 sm:space-y-32">
      <Section id="authentication">
        <SectionHeading>Authentication</SectionHeading>
        <Lead>
          All API requests use cookie-based authentication. Log in via the
          dashboard to receive a session cookie. For programmatic access,
          create an API key from your account settings.
        </Lead>
        <CodeBlock language="bash" code={loginCurl} />
      </Section>

      <Section id="jobs">
        <SectionHeading>Indexing blockchain events</SectionHeading>
        <Lead>
          Create a blockchain indexing job by specifying a contract address,
          chain, and event signatures. IndexNode subscribes to those events
          in real time and stores them with cryptographic proof.
        </Lead>
        <CodeBlock language="bash" code={createJobCurl} />
        <motion.p
          variants={fadeUp}
          className="mt-6 text-sm font-semibold uppercase tracking-wider text-gray-400"
        >
          Response example
        </motion.p>
        <CodeBlock language="json" code={createJobResponse} />
      </Section>

      <Section id="graphql">
        <SectionHeading>GraphQL API</SectionHeading>
        <Lead>
          GraphQL is the primary read surface. Mutations create jobs and
          manage credits; subscriptions stream live indexed events.
        </Lead>
        <motion.div
          variants={fadeUp}
          className="mt-5 grid gap-3 rounded-lg border border-gray-800 bg-gray-900/60 p-5 sm:grid-cols-2"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              HTTP endpoint
            </p>
            <p className="mt-1 font-mono text-sm text-amber-400">
              POST https:
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              WebSocket endpoint
            </p>
            <p className="mt-1 font-mono text-sm text-amber-400">
              wss:
            </p>
          </div>
        </motion.div>

        <motion.h3
          variants={fadeUp}
          className="mt-10 text-lg font-semibold text-gray-100"
        >
          Key queries
        </motion.h3>
        <ReferenceTable
          columns={["Query", "Description"]}
          rows={graphQLQueries}
        />

        <motion.h3
          variants={fadeUp}
          className="mt-10 text-lg font-semibold text-gray-100"
        >
          Key mutations
        </motion.h3>
        <ReferenceTable
          columns={["Mutation", "Description"]}
          rows={graphQLMutations}
        />

        <motion.h3
          variants={fadeUp}
          className="mt-10 text-lg font-semibold text-gray-100"
        >
          Subscription example
        </motion.h3>
        <CodeBlock language="graphql" code={subscriptionExample} />
      </Section>

      <Section id="verify">
        <SectionHeading>Verifying on-chain proof</SectionHeading>
        <Lead>
          Every indexed event has a content hash. Batches of events are
          hashed into a Merkle tree and the root is committed on-chain. You
          can verify any event independently.
        </Lead>
        <CodeBlock language="bash" code={verifyCurl} />
        <motion.p
          variants={fadeUp}
          className="mt-6 text-sm font-semibold uppercase tracking-wider text-gray-400"
        >
          Response
        </motion.p>
        <CodeBlock language="json" code={verifyResponse} />
      </Section>

      <Section id="rest">
        <SectionHeading>REST API reference</SectionHeading>
        <Lead>
          Every REST endpoint is JSON in / JSON out. Authenticated routes
          accept the HttpOnly auth_token cookie or an{" "}
          <span className="font-mono text-amber-400">
            Authorization: Bearer
          </span>{" "}
          API key header.
        </Lead>
        <RestTable />
      </Section>

      <Section id="credits">
        <SectionHeading>Credits and billing</SectionHeading>
        <Lead>
          IndexNode uses INC credits for API usage. Credits are deducted
          when a job is created, not when it completes. Unused credits
          never expire.
        </Lead>
        <motion.div
          variants={fadeUp}
          className="mt-6 grid gap-4 sm:grid-cols-2"
        >
          <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-amber-500/10 text-amber-500">
              <Globe className="h-4 w-4" />
            </span>
            <p className="mt-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
              Crawl job
            </p>
            <p className="mt-2 font-mono text-3xl font-bold text-amber-500">
              100
            </p>
            <p className="mt-1 text-xs text-gray-500">
              credits per HTTP crawl
            </p>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-amber-500/10 text-amber-500">
              <Boxes className="h-4 w-4" />
            </span>
            <p className="mt-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
              Event indexing
            </p>
            <p className="mt-2 font-mono text-3xl font-bold text-amber-500">
              50
            </p>
            <p className="mt-1 text-xs text-gray-500">
              credits per blockchain index job
            </p>
          </div>
        </motion.div>
      </Section>
    </div>
  );
}
