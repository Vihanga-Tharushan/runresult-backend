import User from "../models/user.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import axios from "axios";
import nodemailer from "nodemailer";
import OTP from "../models/otpModel.js";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.APP_PASSWORD,
    },
});

export function createUser(req, res) {

    const hashedPassword = bcrypt.hashSync(req.body.password, 10);
    const user = new User({
        email: req.body.email,
        name: req.body.name,
        password: hashedPassword,
        role: req.body.role
    });
    user.save()
        .then(() => {
            res.json({
                message: "User created successfully"
            });
        })
        .catch((err) => {
            res.json({
                message: "Error creating user"
            });
        });
}

export async function googleLogin(req, res) {
    const token = req.body.token;

    if(token == null){
        return res.json({
            message: "Token not provided"
        });
    }

    try {

        
        const googleResponse = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });


        const googleUser = googleResponse.data;

        const user = await User.findOne({ email: googleUser.email });

        if (user == null) {
            // If user doesn't exist, create a new user
            const newUser = new User({
                email: googleUser.email,
                name: googleUser.given_name,
                password: "abc", // No password for Google login
                role: "athlete", // Default role for Google login
                isEmailVerified: true // Email is verified by Google
            });

            let savedUser = await newUser.save();

            const jwtToken = jwt.sign({
                email: savedUser.email,
                name: savedUser.name,
                role: savedUser.role,
                isEmailVerified: savedUser.isEmailVerified
            }, process.env.JWT_SECRET);

            res.json({
                message: "User created and logged in successfully",
                token: jwtToken,
                user: {
                    email: savedUser.email,
                    name: savedUser.name,
                    role: savedUser.role,
                    isEmailVerified: savedUser.isEmailVerified
                }
            });




        }else {
            // login existing user
            const token = jwt.sign({
                email: user.email,
                name: user.name,
                role: user.role,
                isEmailVerified: user.isEmailVerified
            }, process.env.JWT_SECRET);

            res.json({
                message: "User logged in successfully",
                token: token,
                user: {
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    isEmailVerified: user.isEmailVerified
                }
            });
        }

    }catch (error) {
        console.error("Google login error:", error.response?.data || error.message || error);
        return res.json({
            message: "Error verifying token"
        });
    }


}

export function loginUser(req, res) {

    User.findOne({ email: req.body.email })
        .then((user) => {
            if (!user) {
                return res.json({
                    message: "User not found"
                });
            }
            bcrypt.compare(req.body.password, user.password)
                .then((isMatch) => {
                    if (!isMatch) {
                        return res.json({
                            message: "Invalid password"
                        });
                    }

                    const token = jwt.sign({
                        email: user.email,
                        name: user.name,
                        role: user.role,
                        isEmailVerified: user.isEmailVerified
                    }, process.env.JWT_SECRET);
                    
                    res.json({
                        message: "Login successful",
                        token: token,
                        user: {
                            email: user.email,
                            name: user.name,
                            lastName: user.lastName,
                            role: user.role,
                            isEmailVerified: user.isEmailVerified
                        }
                    });
                });
        })
        .catch((err) => {
            res.json({
                message: "Error logging in"
            });
        });
}

export function isAdmin(req){
    if(req.user == null){
        return false;
    }
    if(req.user.role != "admin"){
        return false;
    }
    return true;
}

export function isAthlete(req){
    if(req.user == null){
        return false;
    }
    if(req.user.role != "athlete"){
        return false;
    }
    return true;
}

export function getUser(req, res){

    if(req.user == null){
        return res.json({
            message: "User not logged in"
        });
    }
    res.json({
        user: req.user
    });

}

export function getStaff(req, res) {
    if (!isAdmin(req)) {
        return res.status(403).json({ message: "Access denied. Admin only." });
    }
    User.find({ role: 'staff' })
        .select('-password')
        .then(users => res.json({ staff: users }))
        .catch(() => res.status(500).json({ message: "Error fetching staff" }));
}

export function createStaff(req, res) {
    if (!isAdmin(req)) {
        return res.status(403).json({ message: "Access denied. Admin only." });
    }
    const hashedPassword = bcrypt.hashSync(req.body.password, 10);
    const user = new User({
        email: req.body.email,
        name: req.body.name,
        password: hashedPassword,
        role: 'staff',
    });
    user.save()
        .then(saved => {
            const { password, ...userData } = saved.toObject()
            res.json({ message: "Staff account created successfully", user: { ...userData, _id: saved._id } })
        })
        .catch(err => res.status(500).json({ message: err.code === 11000 ? 'Email already exists' : 'Error creating staff account' }));
}

export function getUserCounts(req, res) {
    if (!isAdmin(req)) {
        return res.status(403).json({ message: "Access denied. Admin only." });
    }
    Promise.all([
        User.countDocuments({ role: 'athlete' }),
        User.countDocuments({ role: 'staff' }),
        User.countDocuments(),
    ])
        .then(([athletes, staff, total]) => {
            res.json({ athletes, staff, totalUsers: total })
        })
        .catch(() => res.status(500).json({ message: "Error fetching user counts" }))
}

export function updateProfile(req, res) {
    User.findOne({ email: req.user.email })
        .then(user => {
            if (!user) return res.status(404).json({ message: "User not found" })
            if (req.body.name) user.name = req.body.name
            if (req.body.currentPassword && req.body.newPassword) {
                if (!bcrypt.compareSync(req.body.currentPassword, user.password)) {
                    return res.status(400).json({ message: "Current password is incorrect" })
                }
                if (req.body.newPassword.length < 6) {
                    return res.status(400).json({ message: "New password must be at least 6 characters" })
                }
                user.password = bcrypt.hashSync(req.body.newPassword, 10)
            }
            user.save()
                .then(saved => {
                    res.json({ message: "Profile updated successfully", user: { name: saved.name, email: saved.email, role: saved.role, isEmailVerified: saved.isEmailVerified } })
                })
                .catch(() => res.status(500).json({ message: "Error updating profile" }))
        })
        .catch(() => res.status(500).json({ message: "Error finding user" }))
}

export function updateStaff(req, res) {
    if (!isAdmin(req)) {
        return res.status(403).json({ message: "Access denied. Admin only." });
    }
    const updates = {}
    if (req.body.name) updates.name = req.body.name
    if (req.body.password) updates.password = bcrypt.hashSync(req.body.password, 10)
    User.findByIdAndUpdate(req.params.id, updates, { new: true })
        .select('-password')
        .then(user => {
            if (!user) return res.status(404).json({ message: "User not found" })
            res.json({ message: "Staff account updated successfully", user })
        })
        .catch(() => res.status(500).json({ message: "Error updating staff account" }))
}

export function deleteUser(req, res) {
    if (!isAdmin(req)) {
        return res.status(403).json({ message: "Access denied. Admin only." });
    }
    User.findByIdAndDelete(req.params.id)
        .then(user => {
            if (!user) return res.status(404).json({ message: "User not found" });
            res.json({ message: "User deleted successfully" });
        })
        .catch(() => res.status(500).json({ message: "Error deleting user" }));
}

export async function sendOTP(req, res) {

    const email = req.params.email;
    if(email == null){
        res.status(400).json({
            message: "Email not provided"
        });

        return;
    }

    // Generate a 6-digit OTP 100000 to 999999
    const otp = Math.floor(100000 + Math.random() * 900000);

    try{

        await OTP.deleteMany({ email: email });

        const newOTP = new OTP({
            email: email,
            otp: otp
        });

        await newOTP.save();

        await transporter.sendMail({
            from: `"RunResult" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Your Verification Code - RunResult",
            text: `Your verification code is ${otp}. It is valid for 10 minutes.`,
            html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>Verification Code</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  </style>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#F1F5F9;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="background-color:#0342B3;border-radius:14px;padding:10px 16px;">
                    <span style="font-family:'Inter',sans-serif;font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">RunResult</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td style="background-color:#ffffff;border-radius:20px;box-shadow:0 4px 24px rgba(0,0,0,0.06);overflow:hidden;">
              <!-- Blue Top Accent -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="height:4px;background:linear-gradient(90deg,#0342B3,#2563EB,#0342B3);"></td>
                </tr>
              </table>

              <!-- Content -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="padding:40px 40px 16px;">
                <!-- Icon -->
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="background-color:#EFF6FF;border-radius:50%;width:64px;height:64px;text-align:center;vertical-align:middle;">
                          <span style="font-size:28px;line-height:64px;">&#128274;</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Heading -->
                <tr>
                  <td align="center" style="padding-bottom:12px;">
                    <span style="font-family:'Inter',sans-serif;font-size:22px;font-weight:700;color:#0F172A;">Password Reset Request</span>
                  </td>
                </tr>

                <!-- Subtext -->
                <tr>
                  <td align="center" style="padding-bottom:32px;">
                    <span style="font-family:'Inter',sans-serif;font-size:14px;color:#64748B;line-height:1.6;">
                      We received a request to reset your password. Use the verification code below to continue. This code expires in <strong style="color:#0F172A;">10 minutes</strong>.
                    </span>
                  </td>
                </tr>

                <!-- OTP Box -->
                <tr>
                  <td align="center" style="padding-bottom:32px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background-color:#F8FAFC;border:2px dashed #CBD5E1;border-radius:16px;width:100%;">
                      <tr>
                        <td align="center" style="padding:28px 20px;">
                          <span style="font-family:'Inter',sans-serif;font-size:12px;font-weight:600;color:#94A3B8;text-transform:uppercase;letter-spacing:2px;display:block;margin-bottom:10px;">Your Verification Code</span>
                          <span style="font-family:'Inter',sans-serif;font-size:40px;font-weight:800;color:#0342B3;letter-spacing:10px;display:block;">${otp}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Divider -->
                <tr>
                  <td style="padding-bottom:24px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="border-top:1px solid #E2E8F0;font-size:0;line-height:0;">&nbsp;</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Security Notice -->
                <tr>
                  <td style="padding-bottom:8px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background-color:#FEF9EE;border:1px solid #FDE68A;border-radius:12px;width:100%;">
                      <tr>
                        <td style="padding:14px 16px;">
                          <span style="font-family:'Inter',sans-serif;font-size:13px;color:#92400E;line-height:1.5;">
                            &#9888;&#65039; <strong>Didn't request this?</strong> If you didn't ask for a password reset, you can safely ignore this email. Your password will remain unchanged.
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:28px 16px 0;">
              <span style="font-family:'Inter',sans-serif;font-size:12px;color:#94A3B8;line-height:1.6;">
                &copy; ${new Date().getFullYear()} RunResult. All rights reserved.<br/>
                <span style="color:#CBD5E1;">Track. Compete. Achieve.</span>
              </span>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
        });


        res.json({
            message: "OTP sent successfully"
        });

    }catch(err){
        res.status(500).json({
            message: "Error sending OTP"
        });
    }
}


export async function changePasswordViaOTP(req, res) {

    const email = req.body.email;
    const otp = req.body.otp;
    const newPassword = req.body.newPassword;


    const otpRecord = await OTP.findOne({ email: email, otp: otp });

    if(otpRecord == null){
        return res.status(400).json({
            message: "Invalid OTP"
        });
    }

    try {
        await User.updateOne({ email: email }, { password: bcrypt.hashSync(newPassword, 10) });
        await OTP.deleteMany({ email: email });
        res.json({ message: "Password changed successfully" });
    } catch (err) {
        res.status(500).json({ message: "Error changing password" });
    }
}