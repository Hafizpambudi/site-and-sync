/* eslint-disable @next/next/no-img-element -- case-study images are committed
   local assets with unknown intrinsic dimensions; next/image would need width
   and height we do not have. */
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const components: Components = {
  // The page owns the single h1, so a "#" in the article body becomes an h2.
  h1: ({ children }) => <h2>{children}</h2>,
  img: ({ src, alt }) => (
    <img src={typeof src === "string" ? src : undefined} alt={alt ?? ""} loading="lazy" decoding="async" />
  ),
  a: ({ href, children }) => {
    const external = typeof href === "string" && href.startsWith("http");
    return (
      <a
        href={href}
        rel={external ? "noreferrer noopener" : undefined}
        target={external ? "_blank" : undefined}
      >
        {children}
      </a>
    );
  },
  table: ({ children }) => (
    <div className="prose-table-scroll">
      <table>{children}</table>
    </div>
  ),
};

export function Prose({ markdown }: { markdown: string }) {
  return (
    <div className="prose-editorial">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}