import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

async function findStaleId() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error("MONGODB_URI not found");
            process.exit(1);
        }

        await mongoose.connect(process.env.MONGODB_URI);
        const db = mongoose.connection.db;
        const staleId = "69aab6d63cde9e03dc377c3c";

        console.log(`\n🔍 Searching for ID ${staleId} in all collections:`);
        const collections = await db.listCollections().toArray();

        for (const col of collections) {
            const count = await db.collection(col.name).countDocuments({
                $or: [
                    { _id: staleId },
                    { _id: new mongoose.Types.ObjectId(staleId) },
                    { employee_id: staleId },
                    { employee_id: new mongoose.Types.ObjectId(staleId) },
                    { userId: staleId },
                    { userId: new mongoose.Types.ObjectId(staleId) }
                ]
            });
            if (count > 0) {
                console.log(`  - Found in collection: ${col.name} (${count} matches)`);
            }
        }

        process.exit(0);
    } catch (err) {
        console.error("❌ Error:", err);
        process.exit(1);
    }
}

findStaleId();
