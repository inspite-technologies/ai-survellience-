import bcrypt from 'bcrypt';
import mongoose from 'mongoose';

var Schema = mongoose.Schema
 var hrSchema = new Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true
    },
    password:{
        type:String,
        required:true
    },
    fcmTokens: [{
        token: { type: String, required: true },
        deviceType: { type: String, default: 'web' },
        lastUpdated: { type: Date, default: Date.now }
    }],
    fcmToken: { type: String, default: null }
 })
 hrSchema.pre("save",async function(next){
    if(!this.isModified("password")){
        next()
    }
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password,salt)
    })
    hrSchema.methods.matchPassword = async function(enteredPassword){
        return await bcrypt.compare(enteredPassword,this.password)
    }

const HR = mongoose.model("HR",hrSchema)
export default HR

