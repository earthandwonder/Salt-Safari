import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/log/:path*",
    "/alerts/:path*",
    "/u/:path*",
    "/api/alerts/:path*",
    "/api/sightings/:path*",
    "/auth/:path*",
  ],
};
