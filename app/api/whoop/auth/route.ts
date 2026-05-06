import { NextResponse } from "next/server";
import { authUrl } from "@/lib/whoop";
import crypto from "crypto";

export async function GET() {
  const state = crypto.randomBytes(16).toString("hex");
  const res = NextResponse.redirect(authUrl(state));
  res.cookies.set("whoop_state", state, { httpOnly: true, sameSite: "lax", maxAge: 600 });
  return res;
}
