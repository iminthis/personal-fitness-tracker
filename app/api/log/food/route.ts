import { NextRequest, NextResponse } from "next/server";
import { sql, todayISO, ensureMigrated } from "@/lib/db";

export async function POST(req: NextRequest) {
  await ensureMigrated();
  const body = await req.json();
  const date = body.date || todayISO();
  const name = String(body.name || "").trim() || "Food";
  const calories = Math.max(0, parseInt(body.calories) || 0);
  const protein_g = Math.max(0, parseInt(body.protein_g) || 0);
  await sql`INSERT INTO food_entry (date, name, calories, protein_g) VALUES (${date}, ${name}, ${calories}, ${protein_g})`;
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  await ensureMigrated();
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  await sql`DELETE FROM food_entry WHERE id = ${parseInt(id)}`;
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  await ensureMigrated();
  const url = new URL(req.url);
  const date = url.searchParams.get("date") || todayISO();
  const rows = await sql`SELECT * FROM food_entry WHERE date = ${date} ORDER BY id DESC`;
  return NextResponse.json({ rows });
}
