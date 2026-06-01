import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";
import { blogPosts } from "@/content/blog";
import BlogContent from "@/components/marketing/blog-content";

export async function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) notFound();

  return (
    <article className="mx-auto max-w-3xl px-6 py-24">
      <Link
        href="/blog"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 transition hover:text-amber-400"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All posts
      </Link>

      <header className="mt-6 border-b border-gray-800 pb-8">
        <h1 className="text-4xl font-bold tracking-tight text-gray-100">
          {post.title}
        </h1>
        <p className="mt-3 text-base text-gray-400">{post.excerpt}</p>
        <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-gray-500">
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            {post.readTime}
          </span>
        </div>
      </header>

      <div className="prose prose-invert mt-10 max-w-none">
        <BlogContent blocks={post.content} />
      </div>
    </article>
  );
}
