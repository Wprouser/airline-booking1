import { Router } from "express";
import { pool } from "../db/pool.js";

export const airportsRouter = Router();

airportsRouter.get("/", async (_req, res) => {
  const { rows } = await pool.query(
    "SELECT code, name, city, country FROM airports ORDER BY city",
  );
  res.json(rows);
});
