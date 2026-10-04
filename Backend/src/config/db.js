import mongoose from "mongoose";
import { config } from "./config.js";

const ConnectDb = async () => {
    await mongoose.connect(config.MONGODB_URI);
    console.log("Database connected ");

}

export default ConnectDb;