import User from "../models/user.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import axios from "axios";

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