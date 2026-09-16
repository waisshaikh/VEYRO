import Usermodel from "../models/user.model.js";
import jwt from "jsonwebtoken";
import {config} from "../config/config.js";


async function sendTokenResponse(user, res, message) {
    const token = jwt.sign(
        {
            id: user._id,
        },
        config.JWT_SECRET,
        {
            expiresIn: "7d",
        }
    );

    res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
    });

    return res.status(201).json({
        message,
        success: true,
        token,
        user: {
            id: user._id,
            email: user.email,
            contact: user.contact,
            fullname: user.fullname,
            role: user.role,
        },
    });
}

export const regiterController = async (req, res) => {
    const { email, contact, password, fullname, isSeller } = req.body;
    try {
        const isUserExiste = await Usermodel.findOne({
            $or: [{ contact }, { email }],
        });

        if (isUserExiste) {
            return res
                .status(400)
                .json({ message: "User Already Exists With this Email or Contact" });
        }

        const user = await Usermodel.create({
            email,
            contact,
            password,
            fullname,
            role: isSeller ? "seller" : "buyer",
        });

        await sendTokenResponse(user, res, "User registered successfully");
    } catch (error) {
        console.error("Registration error:", error);
        return res.status(500).json({ message: "Server Error" });
    }
};


export const loginController = async (req, res) => {

    const { email, password } = req.body;


    const user = await Usermodel.findOne({ email });

    if (!user) {
        return res.status(400).json({ message: "User Not Found " })

    }

    const isMatch = await user.comparePassword(password);


    if (!isMatch) {
        return res.status(401).json({ message: " invalid password" })
    }


    await sendTokenResponse(user, res, "Login successfully");

}


// Get current logged-in user from JWT cookie
export const meController = async (req, res) => {
    try {
        const token = req.cookies?.token;
        if (!token) return res.status(401).json({ message: "Not authenticated" });

        const decoded = jwt.verify(token, config.JWT_SECRET);
        const user = await Usermodel.findById(decoded.id).select("-password");
        if (!user) return res.status(401).json({ message: "User not found" });

        return res.status(200).json({
            success: true,
            user: {
                id: user._id,
                email: user.email,
                contact: user.contact,
                fullname: user.fullname,
                role: user.role,
            },
        });
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};

export const googleAuthController = async (req, res) => {
    try {
        const user = req.user; // set by Passport after verify callback

        const token = jwt.sign(
            { id: user._id },
            config.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
        });

        // Redirect to frontend home page after successful login
        return res.redirect("http://localhost:5173/");
    } catch (error) {
        console.error("Google auth error:", error);
        return res.redirect("http://localhost:5173/register?error=google_failed");
    }
};

export const logoutController = async (req, res) => {
    try {
        res.clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
        });
        return res.status(200).json({
            success: true,
            message: "Logged out successfully",
        });
    } catch (error) {
        return res.status(500).json({ message: "Logout failed" });
    }
};
