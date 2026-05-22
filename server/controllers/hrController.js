import generateToken from '../utils/generateToken.js'
import HR from '../models/hrSchema.js';

const HRSignup = async (req, res) => {
  const { phoneNumber } = req.body;
  try {
    const existHR = await HR.findOne({ phoneNumber });
    if (existHR) {
      return res.status(400).json({
        msg: "Hr already exist",
      });
    }
    const HRDetails = await HR.create(req.body);
    res.status(201).json({
      msg: "Hr detailes added succesfully",
      HRDetails,
    });
  } catch (err) {
    res.status(400).json({
      err,
    });
  }
};

const HRLogin = async (req, res) => {
  const { email, password } = req.body
  try {
    const existHR = await HR.findOne({ email })
    if (!existHR) {
      res.status(400).json({
        msg: "HR not found"
      })
    }
    if (await existHR.matchPassword(password)) {
      return res.status(200).json({
        msg: "login success",
        data: generateToken(existHR._id, "hr")

      })
    } else {
      return res.status(400).json({
        msg: "Incorrect password"
      })
    }
  } catch (err) {
    console.log(err)
    res.status(400).json({
      msg: err
    })
  }
}

// Get current HR user details
const getCurrentHR = async (req, res) => {
  try {
    const { id } = req.params;

    const hr = await HR.findById(id).select('-password');

    if (!hr) {
      return res.status(404).json({ msg: "HR user not found" });
    }

    res.status(200).json(hr);
  } catch (err) {
    console.error('Error fetching HR:', err);
    res.status(500).json({ msg: err.message });
  }
};

export { HRSignup, HRLogin, getCurrentHR }