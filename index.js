import express from 'express';
import mongoose from 'mongoose';
import dotenv from "dotenv";
import cors from 'cors';
import jwt from 'jsonwebtoken';
import userRouters from './routes/userRouter.js';
import championshipRouters from './routes/championshipRouter.js';
import registrationRouters from './routes/registrationRouter.js';
import resultRouters from './routes/resultRouter.js';

dotenv.config();

const app = express();
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON bodies

//optional token verification middleware
const verifyToken = (req, res, next) => {
    
    let token = req.header("Authorization");

    if(token != null){
        //remove "Bearer " from token
        token = token.replace("Bearer ", "");

        jwt.verify(token, process.env.JWT_SECRET, (err, decoded)=>{
            
            if(err){
                return res.json({
                    message: "Invalid token"
                });
            }
            if(decoded == null){
                return res.json({
                    message: "Invalid token"
                });
            }
            req.user = decoded;
            next();
        });
    } else {
        next(); // Allow request to proceed without token
    }
};

app.use(verifyToken); // Apply to all routes

const connectionString = process.env.MONGO_URL;

mongoose.connect(connectionString)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error);
  });

// Define routes
app.use("/api/users", userRouters);
app.use("/api/championships", championshipRouters);
app.use("/api/registrations", registrationRouters);
app.use("/api/results", resultRouters);


const port = process.env.PORT;

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});



