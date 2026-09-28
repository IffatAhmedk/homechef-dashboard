import { NextResponse, type NextRequest } from "next/server";
import { PREVIEW_COOKIE } from "@/lib/preview";

/** Starts a preview: the dashboard with no data, for anyone, without signing in. */
export function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/admin-dashboard", request.url));
  response.cookies.set(PREVIEW_COOKIE, "1", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 });
  return response;
}
