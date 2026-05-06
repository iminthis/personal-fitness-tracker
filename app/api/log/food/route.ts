import { NextRequest, NextResponse } from "next/server";
import { db, todayISO } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const date = body.date || todayISO();
  const name = String(body.name || "").trim() || "Food";
  const calories = Math.max(0, parseInt(body.calories) || 0);
  const protein_g = Math.max(0, parseInt(body.protein_g) || 0);
  db()
    .prepare(`INSERT INTO food_entry (date, name, calories, protein_g) VALUES (?, ?, ?, ?)`)
    .run(date, name, calories, protein_g);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  db().prepare(`DELETE FROM food_entry WHERE id = ?`).run(id);
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const date = url.searchParams.get("date") || todayISO();
  const rows = db().prepare(`SELECT * FROM food_entry WHERE date = ? ORDER BY id DESC`).all(date);
  return NextResponse.json({ rows });
}
