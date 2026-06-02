export function isValidAdminToken(token: string | null) {
  return Boolean(
    token &&
      process.env.ADMIN_SESSION_TOKEN &&
      token === process.env.ADMIN_SESSION_TOKEN
  );
}