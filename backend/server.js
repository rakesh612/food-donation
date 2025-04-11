import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import path from "path";
import cors from "cors";


dotenv.config();
const app = express();

app.use(express.json({ limit: "10mb" })); // allows you to parse the body of the request
app.use(cookieParser()); // allows you to parse cookies in the request
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));



