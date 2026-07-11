import express from "express";
import { createUser, loginUser, getUser, googleLogin } from "../controllers/userController.js";

const userRouters = express.Router();

userRouters.post("/",createUser);
userRouters.post("/login", loginUser);
userRouters.post("/google-login", googleLogin);
userRouters.get("/me", getUser);
export default userRouters;