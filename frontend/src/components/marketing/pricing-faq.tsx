"use client";

import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

interface FaqItem {
  question: string;
  answer: string;
}

const faqs: FaqItem[] = [
  {
    question: "What is a credit?",
    answer:
      "Credits are IndexNode's usage currency. Crawl jobs cost 100 credits, event indexing jobs cost 50 credits. Credits never expire.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. Monthly plans can be cancelled at any time. Credits purchased separately never expire.",
  },
  {
    question: "Is on-chain proof really included?",
    answer:
      "Yes, in every plan including Free. Every event batch gets a Merkle root committed on-chain at no extra cost.",
  },
  {
    question: "What chains do you support?",
    answer:
      "Ethereum and Polygon on all plans. Additional chains available on Growth and above.",
  },
  {
    question: "What happens when I run out of credits?",
    answer:
      "Jobs are queued until you top up. No data is lost. Free plan users can purchase credit packs at any time.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
} as const;

export default function PricingFaq() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-6">
        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp}
          className="text-center text-3xl font-bold tracking-tight text-gray-100 sm:text-4xl"
        >
          Frequently asked questions
        </motion.h2>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.08 } },
          }}
          className="mt-10 space-y-3"
        >
          {faqs.map((faq) => (
            <motion.details
              key={faq.question}
              variants={fadeUp}
              className="group rounded-xl border border-gray-800 bg-gray-900/60 px-5"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-semibold text-gray-100 transition hover:text-amber-400">
                {faq.question}
                <ChevronDown className="h-4 w-4 shrink-0 text-amber-500 transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <p className="pb-5 pr-8 text-sm leading-relaxed text-gray-400">
                {faq.answer}
              </p>
            </motion.details>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
