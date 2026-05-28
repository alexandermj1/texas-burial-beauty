// This function has been disabled for security reasons.
// It previously reset admin passwords to a weak default value, which is a
// critical vulnerability if the endpoint is ever called by an attacker.
// If admin seeding is needed again, do it manually from the Cloud users panel.

Deno.serve(() => {
  return new Response(
    JSON.stringify({ error: "This endpoint has been permanently disabled." }),
    { status: 410, headers: { "Content-Type": "application/json" } }
  );
});
