import { NextResponse } from "next/server";
import { prisma } from "@/lib/tom/db";

export async function GET() {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { timestamp: "desc" },
      take: 100,
    });
    return NextResponse.json({ logs });
  } catch {
    return NextResponse.json({ logs: [] });
  }
}
