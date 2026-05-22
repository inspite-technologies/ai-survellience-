import mongoose from "mongoose";

const faceVectorSchema = new mongoose.Schema(
    {
        employee_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Face",
            required: true,
            index: true,
        },
        embedding: {
            type: [Number],
            required: true,
        },
        created_at: {
            type: Date,
            default: Date.now,
        },
    },
    {
        collection: "face_vectors", // Ensure it matches the Python-managed collection name
    }
);

const FaceVector = mongoose.model("FaceVector", faceVectorSchema);

export default FaceVector;
