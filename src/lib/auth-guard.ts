import { auth } from "./auth";
import { NextResponse } from "next/server";

/**
 * Get the authenticated user's ID from the session.
 * Returns the userId string, or a 401 NextResponse if not authenticated.
 */
export async function getAuthenticatedUserId(): Promise<
  string | NextResponse
> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return session.user.id;
}
