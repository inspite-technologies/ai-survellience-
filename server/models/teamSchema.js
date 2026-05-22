import mongoose from "mongoose";

const Schema = mongoose.Schema;

const teamSchema = new Schema({
    teamName: {
        type: String,
        required: true,
    },
    manager: {
        type: Schema.Types.ObjectId,
        ref: "Manager",
        required: true
    },
    employees: [
        {
            type: Schema.Types.ObjectId,
            ref: "Face",
        },
    ],
}, { timestamps: true });

const Team = mongoose.model("Team", teamSchema);
export default Team;
