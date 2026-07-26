import express from "express";
import {
  createPreviousResult,
  getPreviousResults,
  getPreviousResult,
  updatePreviousResult,
  deletePreviousResult,
} from "../controllers/previousResultController.js";

const previousResultRouters = express.Router();

previousResultRouters.post("/", createPreviousResult);
previousResultRouters.get("/", getPreviousResults);
previousResultRouters.get("/:id", getPreviousResult);
previousResultRouters.put("/:id", updatePreviousResult);
previousResultRouters.delete("/:id", deletePreviousResult);

export default previousResultRouters;
