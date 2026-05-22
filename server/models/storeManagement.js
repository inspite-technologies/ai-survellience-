import mongoose from 'mongoose';

var Schema = mongoose.Schema
var StoreSchema = new Schema({
    storeName: {
        type: String,
        require: true
    },
    location: {
        type: String,
        required: true
    },
    employeesCount: {
        type: Number,
        required: true
    },
    managerCount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['Active', 'Maintenance', 'Closed'],
        default: 'Active'
    }
})

const StoreManagement = mongoose.model("StoreManagement", StoreSchema)
export default StoreManagement

