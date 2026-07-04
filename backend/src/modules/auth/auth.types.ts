export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  role: "candidate" | "company" | "admin" | "super_admin" | "moderator";
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface TokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  consumed_at: Date | null;
  created_at: Date;
}

export interface ConsumedRefreshTokenRow {
  user_id: string;
  email: string;
  role: "candidate" | "company" | "admin" | "super_admin" | "moderator";
}
