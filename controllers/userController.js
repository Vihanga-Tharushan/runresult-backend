import User from "../models/user.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

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

        
        const googleResponse = await axios.get("https://www.googleapis.com/oauth2/v3/tokeninfo", {
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
                name: googleUser.name,
                password: "abc", // No password for Google login
                role: "athlete", // Default role for Google login
                isEmailVerified: true // Email is verified by Google
            });
            await newUser.save();
        }else {
            
        }

    }catch (error) {
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