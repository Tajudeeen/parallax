import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UsersRepository, type UserRecord } from "@parallax/database";
import { ParallaxError, ValidationError } from "@parallax/shared";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-only-secret-change-in-production";
const JWT_EXPIRES_IN = "7d";
const SALT_ROUNDS = 10;

export class AuthError extends ParallaxError {
  constructor(message: string) {
    super(message, "AUTH_FAILED");
    this.name = "AuthError";
  }
}

export interface AuthResult {
  user: { id: string; email: string };
  token: string;
}

function toAuthResult(user: UserRecord): AuthResult {
  const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
  return { user: { id: user.id, email: user.email }, token };
}

export const AuthService = {
  async register(email: string, password: string): Promise<AuthResult> {
    const existing = await UsersRepository.findByEmail(email);
    if (existing) {
      throw new ValidationError("An account with that email already exists");
    }
    if (password.length < 8) {
      throw new ValidationError("Password must be at least 8 characters");
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await UsersRepository.create(crypto.randomUUID(), email, passwordHash);
    return toAuthResult(user);
  },

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await UsersRepository.findByEmail(email);
    if (!user) {
      throw new AuthError("Invalid email or password");
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new AuthError("Invalid email or password");
    }
    return toAuthResult(user);
  },

  verifyToken(token: string): { userId: string; email: string } {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { sub: string; email: string };
      return { userId: payload.sub, email: payload.email };
    } catch {
      throw new AuthError("Invalid or expired token");
    }
  },
};
