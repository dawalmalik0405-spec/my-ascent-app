"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { cn } from "@/lib/utils";

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="mt-8 border-b border-border/60 pb-2 text-2xl font-bold tracking-tight text-foreground first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-7 text-xl font-semibold tracking-tight text-foreground">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-6 text-lg font-semibold text-foreground">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="mt-5 text-base font-semibold text-foreground">{children}</h4>
  ),
  p: ({ children }) => <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{children}</p>,
  ul: ({ children }) => (
    <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">{children}</ol>
  ),
  li: ({ children }) => <li className="marker:text-primary">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => <em className="italic text-foreground/90">{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="mt-4 border-l-4 border-primary/50 bg-primary/[0.06] py-2 pl-4 pr-3 text-sm italic text-muted-foreground">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-8 border-border/70" />,
  a: ({ href, children }) => {
    const external =
      typeof href === "string" && (href.startsWith("http://") || href.startsWith("https://"));
    return (
      <a
        href={href}
        className="font-medium text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
      >
        {children}
      </a>
    );
  },
  table: ({ children }) => (
    <div className="my-5 overflow-x-auto rounded-xl border border-border/70 shadow-inner">
      <table className="w-full min-w-[520px] border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted/60 dark:bg-muted/30">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-border/60">{children}</tbody>,
  tr: ({ children }) => <tr className="transition-colors hover:bg-muted/25">{children}</tr>,
  th: ({ children }) => (
    <th className="border-b border-border/70 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-foreground">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="max-w-[28rem] whitespace-pre-wrap break-words px-3 py-2.5 align-top text-muted-foreground">
      {children}
    </td>
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = Boolean(className?.includes("language-"));
    if (!isBlock) {
      return (
        <code
          className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.8125rem] text-primary"
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code className={cn("font-mono text-xs text-foreground", className)} {...props}>
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-4 overflow-x-auto rounded-xl border border-border/60 bg-muted/40 p-4 font-mono text-xs leading-relaxed text-foreground dark:bg-muted/25">
      {children}
    </pre>
  ),
};

export function MarkdownReport({
  content,
  className,
}: {
  content: string | null | undefined;
  className?: string;
}) {
  const trimmed = (content ?? "").trim();

  if (!trimmed) return null;

  return (
    <div
      className={cn(
        "markdown-report animate-[markdown-enter_0.45s_ease-out_both] text-foreground",
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {trimmed}
      </ReactMarkdown>
    </div>
  );
}
