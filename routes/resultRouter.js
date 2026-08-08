import express from "express";
import { getFinalResults, getHeatResults } from "../controllers/resultController.js";

const resultRouters = express.Router();

resultRouters.get("/final/:championshipId", getFinalResults);
resultRouters.get("/heat/:championshipId", getHeatResults);

export default resultRouters;
