import type { ReactNode } from "react";

function safeHref(value: string): string | null {
  try {
    const url = new URL(value);
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? value : null;
  } catch {
    return null;
  }
}

function inlineMarkdown(text: string): ReactNode[] {
  const expression = /(\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*|~~[^~]+~~|\*[^*]+\*)/g;
  return text.split(expression).map((token, index) => {
    const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      const href = safeHref(link[2]);
      return href ? <a key={index} className="text-inherit underline decoration-current/40 underline-offset-4 hover:decoration-current" href={href} rel="noreferrer" target="_blank">{link[1]}</a> : link[1];
    }
    if (token.startsWith("`") && token.endsWith("`")) return <code key={index} className="rounded-md border border-surface-border bg-base px-1.5 py-0.5 font-mono text-[0.9em]">{token.slice(1, -1)}</code>;
    if (token.startsWith("**") && token.endsWith("**")) return <strong key={index} className="font-semibold">{token.slice(2, -2)}</strong>;
    if (token.startsWith("~~") && token.endsWith("~~")) return <del key={index}>{token.slice(2, -2)}</del>;
    if (token.startsWith("*") && token.endsWith("*")) return <em key={index}>{token.slice(1, -1)}</em>;
    return token;
  });
}

function isBlockStart(line: string): boolean {
  return /^(\s{0,3}#{1,6}\s|\s{0,3}```|\s{0,3}>|\s{0,3}([-*_])\s*\1\s*\1\s*$|\s*[-*+]\s+|\s*\d+\.\s+)/.test(line);
}

function isTableDivider(line: string): boolean {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

export function SpecMarkdown({ content }: { content: string }) {
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();
    if (!trimmed) {
      index += 1;
      continue;
    }

    const fence = trimmed.match(/^```(.*)$/);
    if (fence) {
      index += 1;
      const codeLines: string[] = [];
      while (index < lines.length && !/^\s*```/.test(lines[index])) codeLines.push(lines[index++]);
      if (index < lines.length) index += 1;
      blocks.push(<pre key={`code-${index}`} className="overflow-x-auto rounded-xl border border-surface-border bg-base p-4 font-mono text-[13px] leading-6"><code data-language={fence[1].trim() || undefined}>{codeLines.join("\n")}</code></pre>);
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+?)\s*#*$/);
    if (heading) {
      const level = Math.min(heading[1].length, 4);
      const headingClasses = ["", "mb-1 text-2xl", "mb-1 mt-2 text-xl", "text-lg", "text-base"][level];
      const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4";
      blocks.push(<Tag key={`heading-${index}`} className={`scroll-mt-4 font-semibold tracking-tight ${headingClasses}`}>{inlineMarkdown(heading[2])}</Tag>);
      index += 1;
      continue;
    }

    if (/^([-*_])\s*\1\s*\1\s*$/.test(trimmed)) {
      blocks.push(<hr key={`rule-${index}`} className="border-surface-border" />);
      index += 1;
      continue;
    }

    if (trimmed.startsWith(">")) {
      const quoteLines: string[] = [];
      while (index < lines.length && /^\s*>/.test(lines[index])) quoteLines.push(lines[index++].replace(/^\s*>\s?/, ""));
      blocks.push(<blockquote key={`quote-${index}`} className="border-l-2 border-brand/50 pl-4">{quoteLines.map((quoteLine, lineIndex) => <p key={lineIndex}>{inlineMarkdown(quoteLine)}</p>)}</blockquote>);
      continue;
    }

    if (index + 1 < lines.length && line.includes("|") && isTableDivider(lines[index + 1])) {
      const parseCells = (value: string) => value.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
      const headers = parseCells(line);
      index += 2;
      const rows: string[][] = [];
      while (index < lines.length && lines[index].includes("|") && lines[index].trim()) rows.push(parseCells(lines[index++]));
      blocks.push(<div key={`table-${index}`} className="overflow-x-auto rounded-xl border border-surface-border"><table className="w-full border-collapse text-left text-sm"><thead className="bg-elevated"><tr>{headers.map((cell, cellIndex) => <th key={cellIndex} className="border-b border-surface-border px-3 py-2 font-semibold">{inlineMarkdown(cell)}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex} className="odd:bg-base/50">{headers.map((_, cellIndex) => <td key={cellIndex} className="border-b border-surface-border/70 px-3 py-2 align-top">{inlineMarkdown(row[cellIndex] ?? "")}</td>)}</tr>)}</tbody></table></div>);
      continue;
    }

    const listMatch = trimmed.match(/^([-*+]|\d+\.)\s+/);
    if (listMatch) {
      const ordered = /^\d/.test(listMatch[1]);
      const items: string[] = [];
      while (index < lines.length) {
        const item = lines[index].trim().match(/^([-*+]|\d+\.)\s+(.+)$/);
        if (!item || ordered !== /^\d/.test(item[1])) break;
        items.push(item[2]);
        index += 1;
      }
      const List = ordered ? "ol" : "ul";
      blocks.push(<List key={`list-${index}`} className={`${ordered ? "list-decimal" : "list-disc"} space-y-1.5 pl-6 marker:text-copy-muted`}>{items.map((item, itemIndex) => <li key={itemIndex} className="pl-1">{inlineMarkdown(item)}</li>)}</List>);
      continue;
    }

    const paragraphLines = [line];
    index += 1;
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines[index]) && !(lines[index].includes("|") && index + 1 < lines.length && isTableDivider(lines[index + 1]))) paragraphLines.push(lines[index++]);
    blocks.push(<p key={`paragraph-${index}`} className="max-w-none">{paragraphLines.map((paragraphLine, lineIndex) => <span key={lineIndex}>{lineIndex > 0 && <br />}{inlineMarkdown(paragraphLine)}</span>)}</p>);
  }

  return <article className="space-y-5 text-[15px] leading-7 sm:text-base sm:leading-8" style={{ color: "white" }}>{blocks}</article>;
}
