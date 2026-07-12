import express from "express";
import { createUser, loginUser, getUser, googleLogin, getStaff, createStaff, getUserCounts, updateProfile, updateStaff, deleteUser, sendOTP , changePasswordViaOTP} from "../controllers/userController.js";

const userRouters = express.Router();

userRouters.post("/",createUser);
userRouters.post("/login", loginUser);
userRouters.post("/google-login", googleLogin);
userRouters.get("/me", getUser);
userRouters.put("/me", updateProfile);
userRouters.get("/counts", getUserCounts);
userRouters.get("/staff", getStaff);
userRouters.post("/staff", createStaff);
userRouters.put("/:id", updateStaff);
userRouters.delete("/:id", deleteUser);
userRouters.get("/send-otp/:email", sendOTP); // New route for sending OTP
userRouters.post("/change-password", changePasswordViaOTP); // New route for changing password

export default userRouters;