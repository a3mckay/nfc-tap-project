import type { Pool } from "pg";

export interface AuthToken {
  token: string;
  email: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
}

export async function createAuthToken(
  pool: Pool,
  token: string,
  email: string,
  ttlMinutes = 15,
): Promise<void> {
  await pool.query(
    `insert into auth_tokens (token, email, expires_at)
     values ($1, $2, now() + ($3 || ' minutes')::interval)`,
    [token, email.trim().toLowerCase(), ttlMinutes],
  );
}

// Mark a token as used and return the email it belongs to. Returns null if token is invalid or already used.
export async function consumeAuthToken(
  pool: Pool,
  token: string,
): Promise<{ email: string } | null> {
  const { rows } = await pool.query<{ email: string }>(
    `update auth_tokens
        set used_at = now()
      where token = $1
        and used_at is null
        and expires_at > now()
      returning email`,
    [token],
  );
  return rows[0] ?? null;
}
