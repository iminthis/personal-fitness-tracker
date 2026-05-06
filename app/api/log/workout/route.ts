import { NextRequest, NextResponse } from "next/server";
import { sql, todayISO, ensureMigrated } from "@/lib/db";

export async function POST(req: NextRequest) {
  await ensureMigrated();
  const body = await req.json();
  const date = body.date || todayISO();
  const type = String(body.type || "").trim() || "Workout";
  const duration_min = body.duration_min ? parseInt(body.duration_min) : null;
  const intensity = body.intensity || null;
  const notes = body.notes || null;
  await sql`
    INSERT INTO workout (date, type, duration_min, intensity, notes, source)
    VALUES (${date}, ${type}, ${duration_min}, ${intensity}, ${notes}, 'manual')
  `;
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  await ensureMigrated();
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  await sql`DELETE FROM workout WHERE id = ${parseInt(id)} AND source = 'manual'`;
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  await ensureMigrated();
  const url = new URL(req.url);
  const date = url.searchParams.get("date") || todayISO();
  const includeHidden = url.searchParams.get("includeHidden") === "1";
  const rows = includeHidden
    ? await sql`SELECT * FROM workout WHERE date = ${date} ORDER BY hidden ASC, id DESC`
    : await sql`SELECT * FROM workout WHERE date = ${date} AND hidden = 0 ORDER BY id DESC`;
  return NextResponse.json({ rows });
}

export async function PATCH(req: NextRequest) {
  await ensureMigrated();
  const body = await req.json();
  const id = parseInt(body.id);
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  if (body.template_key !== undefined) {
    await sql`UPDATE workout SET template_key = ${body.template_key || null} WHERE id = ${id}`;
  }
  if (body.hidden !== undefined) {
    await sql`UPDATE workout SET hidden = ${body.hidden ? 1 : 0} WHERE id = ${id}`;
  }
  return NextResponse.json({ ok: true });
}
