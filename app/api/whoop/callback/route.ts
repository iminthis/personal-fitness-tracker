import { NextRequest, NextResponse } from "next/server";
import { exchangeCode, saveTokens } from "@/lib/whoop";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.cookies.get("whoop_state")?.value;

  if (!code) return NextResponse.json({ error: "missing code" }, { status: 400 });
  if (!state || state !== cookieState) return NextResponse.json({ error: "state mismatch" }, { status: 400 });

  try {
    const tok = await exchangeCode(code);
    saveTokens(tok);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
  return NextResponse.redirect(new URL("/?whoop=connected", req.url));
}
