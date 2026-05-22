import express from 'express'
import { addStore, getAllStores, getEachStore, editStoreDetails, deleteStoreDetails } from "../controllers/storeManagementController.js";

const router = express.Router();
const app = express.Router()

app.route('/').post(addStore).get(getAllStores)
app.route('/:id').get(getEachStore).put(editStoreDetails).delete(deleteStoreDetails)


export default app
