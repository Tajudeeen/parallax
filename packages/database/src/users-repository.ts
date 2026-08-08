import { eq } from "drizzle-orm";
import { getDb } from "./index.js";
import { users } from "./schema.js";

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

export const UsersRepository = {
  async create(id: string, email: string, passwordHash: string): Promise<UserRecord> {
    const [row] = await getDb().insert(users).values({ id, email, passwordHash }).returning();
    return row;
  },

  async findByEmail(email: string): Promise<UserRecord | undefined> {
    const [row] = await getDb().select().from(users).where(eq(users.email, email));
    return row;
  },

  async findById(id: string): Promise<UserRecord | undefined> {
    const [row] = await getDb().select().from(users).where(eq(users.id, id));
    return row;
  },
};
