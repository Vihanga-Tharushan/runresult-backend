import express from "express";
import {
  registerAthlete,
  getRegistrationsByChampionship,
  getMyRegistrations,
} from "../controllers/registrationController.js";

const registrationRouters = express.Router();

registrationRouters.post("/", registerAthlete);
registrationRouters.get("/my", getMyRegistrations);
registrationRouters.get("/championship/:championshipId", getRegistrationsByChampionship);

export default registrationRouters;
