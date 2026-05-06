import { NextResponse } from "next/server";
import { syncWhoop } from "@/lib/whoop";

export async function POST() {
  try {
    const counters = await syncWhoop(60);
    return NextResponse.json({ ok: true, counters });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
