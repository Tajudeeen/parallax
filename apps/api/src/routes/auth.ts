import { Router } from "express";
import { AuthService } from "../auth/service.js";

export const authRouter = Router();

authRouter.post("/auth/register", async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }
    const result = await AuthService.register(email, password);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

authRouter.post("/auth/login", async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }
    const result = await AuthService.login(email, password);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
