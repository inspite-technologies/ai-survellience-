import Admin from "../models/adminSchema.js";
import HR from "../models/hrSchema.js";
import Face from "../models/faceSchema.js";
import Manager from "../models/managerSchema.js";
import generateToken from "../utils/generateToken.js";
import jwt from "jsonwebtoken";

const login = async (req, res) => {
  const { email, name, password } = req.body;
  const identifier = email || name;

  try {
    let user = null;
    let role = null;

    if (!identifier || !password) {
      return res.status(400).json({ msg: "Please provide name/email and password" });
    }

    // Check Admin
    user = await Admin.findOne({ $or: [{ email: identifier }, { name: identifier }] });
    if (user) role = "admin";

    // Check HR
    if (!user) {
      user = await HR.findOne({ $or: [{ email: identifier }, { name: identifier }] });
      if (user) role = "hr";
    }

    // Check Employee
    if (!user) {
      user = await Face.findOne({ $or: [{ email: identifier }, { name: identifier }] });
      if (user) role = "employee";
    }

    // Check Manager
    if (!user) {
      user = await Manager.findOne({ $or: [{ email: identifier }, { name: identifier }] }).select("+password");
      if (user) role = "manager";
    }

    // If user not found in any collection
    if (!user) {
      return res.status(400).json({ msg: "User not found" });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Incorrect password" });
    }

    // Check verification for employees
    if (role === "employee" && user.isVerified === false) {
      return res.status(403).json({ 
        success: false,
        msg: "Your account is pending HR verification. Please wait for approval." 
      });
    }

    return res.status(200).json({
      success: true,
      msg: "Login success",
      data: {
        token: generateToken(user._id, role),
        name: user.name,
        email: user.email,
        role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

const register = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Validate input
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ msg: "Please provide all required fields" });
    }

    // Check if HR user already exists
    const existingHR = await HR.findOne({ email });
    if (existingHR) {
      return res.status(400).json({ msg: "Email already registered" });
    }

    // Check if admin exists with this email
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ msg: "Email already registered" });
    }

    // Create new HR user
    const newHR = await HR.create({
      name,
      email,
      password,
    });

    return res.status(201).json({
      success: true,
      msg: "Registration successful",
      data: {
        token: generateToken(newHR._id, "hr"),
        role: "hr",
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

const updateFCMToken = async (req, res) => {
  const { fcmToken, token: bodyToken } = req.body;
  const targetFCMToken = fcmToken || bodyToken;
  const headerToken = req.headers.token || (req.headers.authorization && req.headers.authorization.startsWith("Bearer ") ? req.headers.authorization.split(" ")[1] : req.headers.authorization);

  console.log(`🔔 updateFCMToken hit. fcmToken: ${targetFCMToken ? 'provided' : 'MISSING'}, Auth: ${headerToken ? 'provided' : 'MISSING'}`);

  if (!targetFCMToken) {
    return res.status(400).json({ success: false, msg: "FCM token is required (use 'fcmToken' or 'token' field)" });
  }

  if (!headerToken) {
    return res.status(401).json({ success: false, msg: "No auth token provided in 'token' or 'Authorization' header" });
  }

  try {
    const decoded = jwt.verify(headerToken, process.env.JWT_SECRET_KEY);
    const userId = decoded.id;
    const role = decoded.role;

    console.log(`👤 Decoded token - ID: ${userId}, Role: ${role || 'N/A'}`);

    let user = null;
    let Model = null;

    if (role === "admin") Model = Admin;
    else if (role === "hr") Model = HR;
    else if (role === "manager") Model = Manager;
    else if (role === "employee") Model = Face;

    if (Model) {
      console.log(`🔍 Searching in ${role} collection...`);
      user = await Model.findByIdAndUpdate(
        userId,
        { fcmToken: targetFCMToken },
        { new: true }
      );
    } else {
      console.log(`⚠️ Role missing in token, trying all collections...`);
      // Fallback: search all collections if role is missing in token
      const models = [{ M: Admin, name: 'Admin' }, { M: HR, name: 'HR' }, { M: Manager, name: 'Manager' }, { M: Face, name: 'Face' }];
      for (const { M, name } of models) {
        console.log(`🔍 Checking ${name}...`);
        user = await M.findByIdAndUpdate(userId, { fcmToken: targetFCMToken }, { new: true });
        if (user) {
          console.log(`✅ Found in ${name}`);
          break;
        }
      }
    }

    if (!user) {
      console.log(`❌ User ${userId} not found in any collection`);
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    console.log(`✨ FCM token updated successfully for user ${userId}`);
    return res.status(200).json({
      success: true,
      msg: "FCM token updated successfully",
    });
  } catch (err) {
    console.error("❌ Error updating FCM token:", err.message);
    return res.status(401).json({ success: false, msg: "Invalid or expired token" });
  }
};

export { login, register, updateFCMToken };
