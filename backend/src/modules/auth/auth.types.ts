export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  role: "candidate" | "company" | "admin";
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface TokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  created_at: Date;
}

export interface RefreshTokenRow extends TokenRow {
  email: string;
  role: "candidate" | "company" | "admin";
}
