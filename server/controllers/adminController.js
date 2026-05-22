import Admin from '../models/adminSchema.js'
import generateToken from '../utils/generateToken.js'

const adminSignup = async (req, res) => {
    const { phoneNumber } = req.body;
    try {
      const existAdmin = await Admin.findOne({ phoneNumber });
      if (existAdmin) {
        return res.status(400).json({
          msg: "Admin already exist",
        });
      }
      const adminDetails = await Admin.create(req.body);
      res.status(201).json({
        msg: "Admin detailes added succesfully",
        adminDetails,
            });
    } catch (err) {
      res.status(400).json({
        err,
      });
    }
  };
  const adminLogin = async (req,res) =>{
    const { email,password } = req.body
    try{
        const existAdmin = await Admin.findOne({email})
        if(!existAdmin){
            res.status(400).json({
                msg:"admin not found"
            })
        }
        if(await existAdmin.matchPassword(password)){
            return res.status(200).json({
                msg: "login success",
                data:generateToken(existAdmin._id, "admin")
                
            })
        } else {
            return res.status(400).json({
                msg:"Incorrect password"
            })
        }
    } catch (err){
        console.log(err)
        res.status(400).json({
            msg:err
        })
    }
}



  export {adminSignup,adminLogin}