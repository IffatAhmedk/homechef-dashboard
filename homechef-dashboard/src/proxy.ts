import { NextResponse, type NextRequest } from "next/server";
import { auth, isAllowedEmail } from "@/lib/auth";
import { PREVIEW_COOKIE, previewData } from "@/lib/preview";

/**
 * Everything except the login page and the sign-in routes needs a signed-in, allowed Google account.
 * The one exception is preview mode: the dashboard screens, with an API that only ever returns empty data.
 */
export async function proxy(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (session && isAllowedEmail(session.user.email)) return NextResponse.next();

  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");

  if (request.cookies.get(PREVIEW_COOKIE)?.value === "1") {
    if (isApi) {
      return request.method === "GET"
        ? NextResponse.json(previewData(pathname))
        : NextResponse.json({ error: "This is a preview with no data — sign in to make changes." }, { status: 403 });
    }
    if (pathname.startsWith("/admin-dashboard")) return NextResponse.next();
  }

  if (isApi) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!login|preview|api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)"],
};
