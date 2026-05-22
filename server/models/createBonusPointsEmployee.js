import mongoose from "mongoose";

const bonusSchema = new mongoose.Schema({
    grooming:{
        type:Number,
        default:0
    },
    attitude:{
        type:Number,
        default:0
    },
    punctuality:{
        type:Number,
        default:0
    } 
});

const BonusEmployee = mongoose.model('BonusEmployee', bonusSchema);
export default BonusEmployee 