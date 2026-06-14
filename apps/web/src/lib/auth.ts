import { cookies } from "next/headers";
import { connectToDatabase, User } from "@repo/db";
import jwt from "jsonwebtoken";

/**
 * Retrieves the currently authenticated user from the session cookie.
 * Securely connects to the database and verifies the session JWT.
 */
export async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) return null;

  try {
    const decoded: any = jwt.verify(token, jwtSecret);
    await connectToDatabase();
    return await User.findById(decoded.userId);
  } catch (e) {
    return null;
  }
}
