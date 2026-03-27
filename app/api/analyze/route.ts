import Anthropic from "@anthropic-ai/sdk";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return new Response(JSON.stringify({ error: "No file provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const logContent = await file.text();

  if (!logContent.trim()) {
    return new Response(JSON.stringify({ error: "File is empty" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const client = new Anthropic();

  const stream = client.messages.stream({
    model: "claude-opus-4-6",
    max_tokens: 64000,
    thinking: { type: "adaptive" },
    system: `You are an expert log file analyzer. Your job is to analyze log files and clearly identify all problems, anomalies, and areas of concern.

Structure your response as follows:
1. **Summary** — A brief 2-3 sentence overview of the log file and the most critical findings.
2. **Issues Found** — List each issue with:
   - Severity: 🔴 Critical / 🟠 High / 🟡 Medium / 🔵 Low
   - Description of the problem
   - Relevant log lines (quoted)
   - Likely root cause
   - Recommended fix
3. **Patterns & Anomalies** — Any recurring patterns, trends, or unusual behaviour worth noting.
4. **Recommendations** — Prioritised action items to resolve the issues.

Be thorough, precise, and actionable. Quote specific log lines to support your findings.`,
    messages: [
      {
        role: "user",
        content: `Please analyze the following log file:\n\n\`\`\`\n${logContent}\n\`\`\``,
      },
    ],
  });

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(new TextEncoder().encode(event.delta.text));
          }
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-cache",
    },
  });
}
