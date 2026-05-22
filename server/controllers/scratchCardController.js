import ScratchCard from "../models/scratchCardSchema.js";

/**
 * CREATE SCRATCH CARDS (ADMIN)
 */
export const createScratchCards = async (req, res) => {
  try {
    let { employeeIds, options, validUntil, maxRedemptions } = req.body;

    if (!Array.isArray(employeeIds)) employeeIds = [employeeIds];
    if (!employeeIds.length) return res.status(400).json({ msg: "Select at least one employee" });

    // options should be an array of 3 reward configurations
    const files = req.files || [];
    const hrId = req.hrId;
    const now = new Date();
    const contentType = req.headers['content-type'] || 'no-content-type';

    console.log(`DEBUG [ScratchCard Create] Content-Type: ${contentType}`);
    console.log("DEBUG [ScratchCard Create] Body keys:", Object.keys(req.body));
    console.log("DEBUG [ScratchCard Create] Files received:", files.map(f => ({ fieldname: f.fieldname, size: f.size })));

    if (!Array.isArray(options) || options.length === 0) {
      return res.status(400).json({ msg: "Provide at least one reward option" });
    }

    const createdCards = [];

    for (const emp of employeeIds) {
      const id = typeof emp === "object" ? emp._id : emp;
      const name = typeof emp === "object" ? emp.name : "Employee";

      // Unique batch ID for this employee's set of 3 cards
      const batchId = `BATCH-${id}-${now.getTime()}`;

      const employeeBatchCards = await Promise.all(
        options.map((opt, index) => {
          // Reliable image mapping using fieldname (images_0, images_1, etc.)
          const fileObj = files.find(f => f.fieldname === `images_${index}`);
          console.log(`DEBUG [ScratchCard Create] Mapping index ${index} to file:`, fileObj ? fileObj.fieldname : "NOT FOUND");
          
          const filePath = fileObj ? (fileObj.path || fileObj.secure_url || fileObj.url) : null;
          const optionImages = filePath ? [filePath] : [];

          return ScratchCard.create({
            employeeId: id,
            employeeName: name,
            title: opt.title,
            description: opt.description,
            rewardType: opt.rewardType,
            rewardValue: opt.rewardValue,
            code: opt.code,
            batchId,
            validUntil,
            maxRedemptions: maxRedemptions || 1,
            images: optionImages,
            createdBy: hrId,
          });
        })
      );
      createdCards.push(...employeeBatchCards);

      // ✅ Send Push Notification to Employee
      try {
        const FaceModel = (await import("../models/faceSchema.js")).default;
        const employee = await FaceModel.findById(id);
        if (employee) {
          const { sendPushNotification } = await import("../services/notificationService.js");
          const tokens = [];
          if (employee.fcmToken) tokens.push(employee.fcmToken);
          if (employee.fcmTokens && employee.fcmTokens.length > 0) {
            tokens.push(...employee.fcmTokens.map(t => t.token));
          }
          
          const uniqueTokens = [...new Set(tokens)];

          if (uniqueTokens.length > 0) {
            const title = "New Scratch Card! 🎴";
            const body = "HR has assigned you a new scratch card. Open it now to reveal your reward!";
            await sendPushNotification(uniqueTokens, title, body, { 
              type: 'scratch_card_assigned', 
              batchId,
              screen: '/scratch-cards',
              isManager: 'false'
            });
          }
        }
      } catch (notifErr) {
        console.error("❌ [Notif] Error sending scratch card notification:", notifErr.message);
      }
    }

    res.status(201).json({ msg: `${createdCards.length} scratch cards created in batches`, data: createdCards });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: err.message });
  }
};


/**
 * UPDATE SCRATCH CARD (ADMIN)
 */
export const adminUpdateScratchCard = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, rewardType, rewardValue, code, validUntil, maxRedemptions } = req.body;

    const card = await ScratchCard.findById(id);
    if (!card) return res.status(404).json({ msg: "Card not found" });

    // Update fields if provided
    if (title) card.title = title;
    if (description) card.description = description;
    if (rewardType) card.rewardType = rewardType;
    if (rewardValue !== undefined) card.rewardValue = rewardValue;
    if (code !== undefined) card.code = code;
    if (validUntil) card.validUntil = validUntil;
    if (maxRedemptions !== undefined) card.maxRedemptions = maxRedemptions;

    // Handle Image Update
    // Check both plural "images" (standard) and singular "image" (fallback)
    const uploadFiles = req.files || [];
    if (uploadFiles.length > 0) {
      const filePath = uploadFiles[0].path || uploadFiles[0].secure_url || uploadFiles[0].url;
      console.log("DEBUG [ScratchCard Update] New image path:", filePath);
      card.images = [filePath];
    } else if (req.body.image && typeof req.body.image === 'string' && req.body.image.startsWith('http')) {
      // Handle cases where a URL might be passed directly
      card.images = [req.body.image];
    }

    await card.save();

    res.status(200).json({
      success: true,
      msg: "Scratch card updated successfully",
      data: card
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: err.message });
  }
};



/**
 * GET ALL SCRATCH CARDS (ADMIN/HR)
 */
export const getAllScratchCards = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const hrId = req.hrId; // assume hrProtect sets req.hrId

    const filter = { createdBy: hrId }; // only cards created by this HR

    const total = await ScratchCard.countDocuments(filter);
    const cards = await ScratchCard.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      meta: { total, page, totalPages: Math.ceil(total / limit) },
      data: cards,
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};


/**
 * GET EMPLOYEE CARDS (EMPLOYEE)
 * - Returns exactly 3 active cards
 */
export const getMyScratchCards = async (req, res) => {
  try {
    const employeeId = req.employeeId;

    const filter = {
      employeeId,
      status: { $in: ["Unredeemed", "Scratched"] },
      validUntil: { $gte: new Date() }
    };

    const cards = await ScratchCard.find(filter)
      .sort({ createdAt: -1 })
      .limit(3);

    res.status(200).json({
      msg: "Employee scratch cards (Top 3 active)",
      data: cards,
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

/**
 * UPDATE SCRATCH/REDEEM STATUS (EMPLOYEE)
 * - Redeeming 1 card invalidates the others
 */
export const updateScratchCardStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, status } = req.body;
    const finalAction = action || status;

    const card = await ScratchCard.findById(id);
    if (!card) return res.status(404).json({ msg: "Card not found" });

    // Ensure employee owns the card
    if (card.employeeId.toString() !== req.employeeId.toString()) {
      return res.status(403).json({ msg: "Not allowed to update this card" });
    }

    const now = new Date();

    // Expiry check
    if (card.validUntil < now || card.status === "Expired") {
      card.status = "Expired";
      card.expiredAt = now;
      await card.save();
      return res.status(400).json({ msg: "Card expired" });
    }

    // SCRATCH
    if (finalAction === "scratched") {
      if (card.scratchedAt) return res.status(400).json({ msg: "Already scratched" });
      card.scratchedAt = now;
      card.status = "Scratched";
    }

    // REDEEM
    else if (finalAction === "redeemed") {
      if (!card.scratchedAt) return res.status(400).json({ msg: "Scratch the card first" });
      if (!card.redemptionCount) card.redemptionCount = 0;
      if (card.redemptionCount >= card.maxRedemptions) return res.status(400).json({ msg: "Max redemptions reached" });

      card.redeemedAt = now;
      card.redemptionCount += 1;
      card.status = "Redeemed";

      // 🔹 EXPIRY OTHER CARDS (Logic: redeems 1, other 2 in batch become invalid)
      const expiryFilter = {
        employeeId: card.employeeId,
        _id: { $ne: card._id },
        status: { $in: ["Unredeemed", "Scratched"] }
      };

      // If this card belongs to a batch, only expire cards in that specific batch
      if (card.batchId) {
        expiryFilter.batchId = card.batchId;
      }

      await ScratchCard.updateMany(expiryFilter, { status: "Expired", expiredAt: now });
    }

    else return res.status(400).json({ msg: "Invalid action/status (" + finalAction + ")" });

    await card.save();

    // Prepare response data
    const responseData = card.toObject();
    
    // In redemption, specifically return the first image for the frontend to display
    if (finalAction === "redeemed" && card.images && card.images.length > 0) {
      responseData.rewardImage = card.images[0];
    }

    res.status(200).json({ 
      success: true,
      msg: `Card ${finalAction} successfully`, 
      data: responseData 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: err.message });
  }
};

/**
 * DELETE SCRATCH CARD (ADMIN)
 */
export const deleteScratchCard = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await ScratchCard.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ msg: "Card not found" });

    res.status(200).json({ msg: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

/**
 * HR: GET SPECIFIC EMPLOYEE CARDS
 */
export const getEmployeeCards = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const cards = await ScratchCard.find({ employeeId }).sort({ createdAt: -1 });

    res.status(200).json({ msg: "Employee scratch cards", data: cards });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

/**
 * HR: GET REDEEMED CARDS (All employees)
 * - Supports monthly and yearly filtering
 */
export const getRedeemedCards = async (req, res) => {
  try {
    const hrId = req.hrId;
    const { month, year } = req.query;

    const filter = {
      createdBy: hrId,
      status: "Redeemed"
    };

    // Monthly Logic
    if (month && year) {
      const startOfMonth = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endOfMonth = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
      filter.redeemedAt = { $gte: startOfMonth, $lte: endOfMonth };
    }

    const cards = await ScratchCard.find(filter)
      .populate("employeeId", "name")
      .sort({ redeemedAt: -1 });

    res.status(200).json({ 
      success: true,
      msg: month && year ? `Redeemed cards for ${month}/${year}` : "All redeemed scratch cards", 
      data: cards 
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};
