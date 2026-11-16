import { NextRequest, NextResponse } from "next/server";
import { computeAnalytics } from "@/lib/analytics";

export async function GET(req: NextRequest) {
  const fromParam = req.nextUrl.searchParams.get("from");
  const toParam = req.nextUrl.searchParams.get("to");

  const to = toParam ? new Date(toParam) : new Date();
  const from = fromParam ? new Date(fromParam) : new Date(to.getFullYear(), to.getMonth(), 1);

  return NextResponse.json(await computeAnalytics(from, to));
}
