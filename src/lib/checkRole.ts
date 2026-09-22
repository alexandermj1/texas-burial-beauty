// Role lookup that always resolves.
//
// The admin dashboard used to hang on "Loading..." forever whenever the role
// query failed (a dropped connection, a brief backend hiccup, a sleeping
// laptop). This helper retries a few times with a hard per-attempt timeout and
// always settles, so the dashboard can render instead of spinning.
export async function checkRole(
  client: any,
  userId: string,
  role: string,
  attempts = 3,
): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    try {
      const query = client
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", role)
        .maybeSingle();

      const result: any = await Promise.race([
        query,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("role check timed out")), 8000),
        ),
      ]);

      if (result?.error) throw result.error;
      return !!result?.data;
    } catch {
      if (i === attempts - 1) return false;
      await new Promise((r) => setTimeout(r, 600 * (i + 1)));
    }
  }
  return false;
}
