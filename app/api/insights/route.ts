import { NextResponse } from "next/server";
import { generateInsights } from "@/lib/insights";

export async function POST() {
  try {
    const out = await generateInsights();
    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json({ markdown: `**Error:** ${e.message}`, tokensUsed: 0 }, { status: 500 });
  }
}
