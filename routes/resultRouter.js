import express from "express";
import { getFinalResults } from "../controllers/resultController.js";

const resultRouters = express.Router();

resultRouters.get("/final/:championshipId", getFinalResults);

export default resultRouters;
