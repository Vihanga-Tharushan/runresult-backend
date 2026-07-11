import express from "express";
import {
  createChampionship,
  getChampionships,
  getChampionship,
  updateChampionship,
  deleteChampionship,
} from "../controllers/championshipController.js";

const championshipRouters = express.Router();

championshipRouters.post("/", createChampionship);
championshipRouters.get("/", getChampionships);
championshipRouters.get("/:id", getChampionship);
championshipRouters.put("/:id", updateChampionship);
championshipRouters.delete("/:id", deleteChampionship);

export default championshipRouters;
