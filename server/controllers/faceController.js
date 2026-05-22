import Face from "../models/faceSchema.js";

export const getFaces = async (req, res) => {
  try {
    // Get all active and verified faces (includes legacy records without isVerified field)
    // $ne: false means: isVerified is true OR isVerified doesn't exist (legacy employees)
    const faces = await Face.find({ isActive: true, isVerified: { $ne: false } }, "-descriptor");
    console.log(`📋 Retrieved ${faces.length} verified faces`);
    res.json(faces);
  } catch (err) {
    console.error('❌ Error getting faces:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const saveFace = async (req, res) => {
  try {
    console.log('📥 Received face save request body:', JSON.stringify(req.body, null, 2));

    const {
      name,
      descriptor,
      email,
      phoneNumber,
      password,
      department,
      position,
      shiftTime,
      joinDate,
      monthlySalary,
      address
    } = req.body;

    if (!name || !email || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Name, email and phone number are required"
      });
    }

    // ✅ Check if name already exists
    const existing = await Face.findOne({ name, isActive: true });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Face with name "${name}" already exists`
      });
    }

    // ✅ Check if email already exists
    if (email) {
      const existingEmail = await Face.findOne({ email, isActive: true });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: `Email "${email}" already exists`
        });
      }
    }

    // ✅ Create new face with phoneNumber as password
    const face = await Face.create({
      name,
      descriptor,
      email: email || undefined,
      phoneNumber,
      password: password || phoneNumber,
      department,
      position,
      shiftTime,
      joinDate,
      monthlySalary,
      address,
      isActive: true,
      isVerified: false // New employees need HR verification
    });

    console.log(`✅ Saved: ${name} (ID: ${face._id})`);

    res.json({
      success: true,
      userId: face._id,
      message: `Face saved successfully: ${name}`
    });

  } catch (err) {
    console.error('❌ Error saving face:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Error saving face to database'
    });
  }
};


export const deleteFace = async (req, res) => {
  try {
    const face = await Face.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!face) {
      console.log(`❌ Face not found: ${req.params.id}`);
      return res.status(404).json({
        success: false,
        message: "Face not found"
      });
    }

    console.log(`🗑️ Deactivated: ${face.name}`);
    res.json({
      success: true,
      message: `Face deactivated: ${face.name}`
    });

  } catch (err) {
    console.error('❌ Error deleting face:', err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

export const updateFace = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`📝 Updating employee: ${id} with body:`, JSON.stringify(req.body, null, 2));

    const updatedEmployee = await Face.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedEmployee) {
      console.log(`❌ Employee not found: ${id}`);
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    console.log(`✅ Updated: ${updatedEmployee.name}`);

    res.status(200).json({
      success: true,
      message: "Employee updated successfully",
      data: updatedEmployee,
    });

  } catch (err) {
    console.error('❌ Error updating employee:', err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const viewEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await Face.findOne(
      { _id: id, isActive: true },
      "-descriptor"   // Hide face vector from response
    );

    if (!employee) {
      console.log(`❌ Employee not found: ${id}`);
      return res.status(404).json({
        success: false,
        message: "Employee not found"
      });
    }

    console.log(`👁️ Viewed: ${employee.name}`);

    res.status(200).json({
      success: true,
      data: employee
    });

  } catch (err) {
    console.error('❌ Error viewing employee:', err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

export const getUnverifiedFaces = async (req, res) => {
  try {
    const faces = await Face.find({ isActive: true, isVerified: false }, "-descriptor");
    console.log(`📋 Retrieved ${faces.length} unverified faces`);
    res.json(faces);
  } catch (err) {
    console.error('❌ Error getting unverified faces:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const verifyFace = async (req, res) => {
  try {
    const { id } = req.params;
    const face = await Face.findByIdAndUpdate(id, { isVerified: true }, { new: true });
    if (!face) return res.status(404).json({ success: false, message: "Employee not found" });
    
    console.log(`✅ Verified: ${face.name}`);
    res.json({ success: true, message: `Employee ${face.name} verified successfully` });
  } catch (err) {
    console.error('❌ Error verifying face:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const rejectFace = async (req, res) => {
  try {
    const { id } = req.params;
    // We can either delete or just deactivate. 
    // Usually rejected registrations are deleted.
    const face = await Face.findByIdAndDelete(id);
    if (!face) return res.status(404).json({ success: false, message: "Employee not found" });
    
    console.log(`❌ Rejected and deleted: ${face.name}`);
    res.json({ success: true, message: `Employee ${face.name} registration rejected` });
  } catch (err) {
    console.error('❌ Error rejecting face:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const handleRegistrationDecision = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // "approved" or "rejected"

    if (status === "approved") {
      const face = await Face.findByIdAndUpdate(id, { isVerified: true }, { new: true });
      if (!face) return res.status(404).json({ success: false, message: "Employee not found" });
      console.log(`✅ Verified: ${face.name}`);
      return res.json({ success: true, message: `Employee ${face.name} approved successfully` });
    } 
    
    if (status === "rejected") {
      const face = await Face.findByIdAndDelete(id);
      if (!face) return res.status(404).json({ success: false, message: "Employee not found" });
      console.log(`❌ Rejected and deleted: ${face.name}`);
      return res.json({ success: true, message: `Employee ${face.name} registration rejected and removed` });
    }

    return res.status(400).json({ success: false, message: "Invalid status. Use 'approved' or 'rejected'" });
  } catch (err) {
    console.error('❌ Error handling registration decision:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};