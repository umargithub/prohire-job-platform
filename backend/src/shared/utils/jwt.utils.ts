import jwt, {
  JwtPayload,
  JsonWebTokenError,
  TokenExpiredError,
} from "jsonwebtoken";
import type { StringValue } from "ms";
import { config } from "../../config";
import { UnauthorizedError } from "../../core/errors/AppError";

export interface AccessTokenPayload {
  userId: string;
  role: string;
}

export function generateAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_ACCESS_EXPIRES_IN as StringValue,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as AccessTokenPayload &
      JwtPayload;
    return { userId: decoded.userId, role: decoded.role };
  } catch (err) {
    if (err instanceof JsonWebTokenError || err instanceof TokenExpiredError) {
      throw new UnauthorizedError("Invalid or expired token");
    }
    throw err;
  }
}
