import Admin from "../models/adminSchema.js";

const initializeAdmin = async () => {
    try {
        // Check if admin exists
        let admin = await Admin.findOne({ email: "admin@gmail.com" });

        if (!admin) {
            // Create new admin only if they don't exist
            admin = await Admin.create({
                email: "admin@gmail.com",
                password: "1234"
            });
            console.log("✅ Admin user initialized successfully");
            console.log("📧 Email: admin@gmail.com");
            console.log("🔑 Password: 1234");
        } else {
            console.log("ℹ️  Admin user already exists (ID: " + admin._id + ")");
        }

    } catch (error) {
        console.error("❌ Error initializing admin:", error);
    }
};

export default initializeAdmin;
