import Link from "next/link";
import { blogPosts } from "@/content/blog";

export const metadata = { title: "Blog" };

export default function BlogPage() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-24">
      <h1 className="text-4xl font-bold">Blog</h1>
      <ul className="mt-8 space-y-4">
        {blogPosts.map((post) => (
          <li key={post.slug}>
            <Link
              href={`/blog/${post.slug}`}
              className="text-amber-500 hover:text-amber-400"
            >
              {post.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
