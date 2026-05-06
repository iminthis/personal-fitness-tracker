"use client";
import { useState } from "react";

export default function InsightsPage() {
  const [loading, setLoading] = useState(false);
  const [md, setMd] = useState<string | null>(null);
  const [tokens, setTokens] = useState<number>(0);

  async function run() {
    setLoading(true);
    const r = await fetch("/api/insights", { method: "POST" });
    const j = await r.json();
    setMd(j.markdown);
    setTokens(j.tokensUsed || 0);
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Insights</h1>
        <div className="text-xs text-muted">
          Powered by Claude Haiku · {tokens > 0 ? `${tokens} tokens used` : "credits-conscious"}
        </div>
      </div>
      <p className="text-sm text-muted max-w-2xl">
        Generates a short coaching brief based on your last 14 days of food, workouts, weight, and Whoop data.
        Run it once a week or after a notable change — saves API credits.
      </p>
      <button className="btn-primary" onClick={run} disabled={loading}>
        {loading ? "Thinking…" : md ? "Regenerate" : "Generate insights"}
      </button>
      {md && (
        <div className="panel p-5 prose prose-invert max-w-none">
          <RenderMarkdown md={md} />
        </div>
      )}
    </div>
  );
}

function RenderMarkdown({ md }: { md: string }) {
  const html = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^### (.*)$/gm, "<h3 class='text-base font-medium mt-3'>$1</h3>")
    .replace(/^## (.*)$/gm, "<h2 class='text-lg font-semibold mt-4'>$1</h2>")
    .replace(/^# (.*)$/gm, "<h1 class='text-xl font-semibold mt-4'>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^\s*[-*] (.*)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul class='list-disc pl-6 space-y-1 my-2'>${m}</ul>`)
    .replace(/\n\n/g, "<br/><br/>");
  return <div className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />;
}
