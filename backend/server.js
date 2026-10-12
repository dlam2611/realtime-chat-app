import dotenv from "dotenv";
import express from "express"
import cookieParser from 'cookie-parser'
import { connectDB } from './src/config/db.js'
import './src/config/redis.js'
import { errorHandler } from './src/middlewares/errorHandle.js'
import router from "./src/routes/v1/index.js"
import cors from "cors"
const nodeEnv = process.env.NODE_ENV || 'development';
dotenv.config({ path: `.env.${nodeEnv}` });
import { app, server } from "./src/socket/index.js";
app.use(express.json());
app.use(cookieParser());
const allowedOrigins = [
    process.env.CLIENT_URL
]
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true)
        } else {
            callback(new ApiError(403, "Origin không được phép"));
        }
    }
    , credentials: true
}));
app.use("/uploads", express.static("uploads"));
app.use("/api/v1", router)
app.get("/", (req, res) => {
    res.json("hello world")
})
app.use(errorHandler)
const PORT = process.env.PORT || 3000
const HOST = process.env.HOST || 'localhost'
connectDB().then(() => {
    server.listen(PORT, () => {
        console.log(`server start http://${HOST}:${PORT}`)
    })
})
