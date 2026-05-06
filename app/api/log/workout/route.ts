import { NextRequest, NextResponse } from "next/server";
import { db, todayISO } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const date = body.date || todayISO();
  const type = String(body.type || "").trim() || "Workout";
  const duration_min = body.duration_min ? parseInt(body.duration_min) : null;
  const intensity = body.intensity || null;
  const notes = body.notes || null;
  db()
    .prepare(
      `INSERT INTO workout (date, type, duration_min, intensity, notes, source) VALUES (?, ?, ?, ?, ?, 'manual')`,
    )
    .run(date, type, duration_min, intensity, notes);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  db().prepare(`DELETE FROM workout WHERE id = ? AND source = 'manual'`).run(id);
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const date = url.searchParams.get("date") || todayISO();
  const includeHidden = url.searchParams.get("includeHidden") === "1";
  const sql = includeHidden
    ? `SELECT * FROM workout WHERE date = ? ORDER BY hidden ASC, id DESC`
    : `SELECT * FROM workout WHERE date = ? AND hidden = 0 ORDER BY id DESC`;
  const rows = db().prepare(sql).all(date);
  return NextResponse.json({ rows });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const id = parseInt(body.id);
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  if (body.template_key !== undefined) {
    db()
      .prepare(`UPDATE workout SET template_key = ? WHERE id = ?`)
      .run(body.template_key || null, id);
  }
  if (body.hidden !== undefined) {
    db().prepare(`UPDATE workout SET hidden = ? WHERE id = ?`).run(body.hidden ? 1 : 0, id);
  }
  return NextResponse.json({ ok: true });
}
