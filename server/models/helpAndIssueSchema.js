import mongoose from "mongoose";

const helpAndIssueSchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Face",
        required: true
    },
    issue:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    }
}, { timestamps: true });

const HelpAndIssue = mongoose.model("HelpAndIssue", helpAndIssueSchema);
export default HelpAndIssue;