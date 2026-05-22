import HelpAndIssue from "../models/helpAndIssueSchema.js";

const createHelpAndIssue = async (req, res) => {
  try {
    const employeeId = req.employeeId;
    const createTicket = await HelpAndIssue.create({
      employeeId,
      ...req.body
    });

    return res.status(201).json({
      success: true,
      msg: "created successfully",
      data: createTicket
    });
  } catch (error) {
    console.error("help and issue Error:", error);
    return res.status(400).json({
      success: false,
      msg: "Creating help and issue failed",
      error: error.message,
    });
  }
};

const fetchHelpAndIssues = async (req, res) => {
  try {
    const issues = await HelpAndIssue.find();

    return res.status(200).json({
      success: true,
      msg:"Fetched successfully",
      data: issues
    });
  }
  catch (error) {
    console.error("Fetch help and issue Error:", error);
    return res.status(400).json({
      success: false,
      msg: "Fetching help and issue failed",
      error: error.message,
    });
  }
}


export {createHelpAndIssue,fetchHelpAndIssues}
