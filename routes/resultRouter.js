import express from "express";
import { getFinalResults, getHeatResults, getStartList, getPoints, getMedals, getRecords, getTrophies } from "../controllers/resultController.js";

const resultRouters = express.Router();

resultRouters.get("/final/:championshipId", getFinalResults);
resultRouters.get("/heat/:championshipId", getHeatResults);
resultRouters.get("/startlist/:championshipId", getStartList);
resultRouters.get("/points/:championshipId", getPoints);
resultRouters.get("/medals/:championshipId", getMedals);
resultRouters.get("/records/:championshipId", getRecords);
resultRouters.get("/trophies/:championshipId", getTrophies);

export default resultRouters;
