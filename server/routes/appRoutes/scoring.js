import express from "express";
import { rateEmployee, getRatings,storeEmployeeAll,getEachEmployeeRatings } from "../../controllers/ratingEmployeeController.js";
import {getManagerScores} from "../../controllers/managerController.js";
import protect from "../../middleware/managerMiddleWare.js";
import protectUser from "../../middleware/userMiddleWare.js";

const router = express.Router();

router.post("/", protect, rateEmployee).get("/", protect, getRatings);
router.get("/employee-ratings",protectUser,getEachEmployeeRatings)
router.post("/submit-all",protect,storeEmployeeAll)

router.get("/manager-scores",protect,getManagerScores)

export default router;