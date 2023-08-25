const User = require('../models/user');
const sha256 = require('js-sha256');
const fs = require('fs');
const cloudinary = require('../config/cloudinary')
const mime = require("mime-types");

const { generateToken } = require('../middlewares/auth');

let msg, errMsg;

const signup = async(req,res) =>{
    try {
        const { name, email, phone, password,referralCode } = req.body;
        const exsistingUser = await User.findOne({ $or: [{ email }, { phone }] });
        if (exsistingUser) return res.status(409).json({ errMsg: "User already found" });

        if(referralCode){
            const referealUser = await User.findOne({referalNumber:referralCode});
            if(!referealUser) return res.status(200).json({errMsg:"Invalid referal code"});

            referealUser.wallet += 50;
            await referealUser.save()
        }

        const timestamp = Date.now();
        const randomNum = Math.floor(Math.random() * 1000);

        const timestampPart = timestamp.toString().slice(-4);
        const randomNumPart = randomNum.toString().padStart(3, '0');
        const referalNumber = `#${timestampPart}${randomNumPart}`;
        const newUser = new User({
            name,
            phone,
            email,
            password: sha256(password + process.env.PASSWORD_SALT),
            referalNumber
        })
        await newUser.save();

        res.status(200).json({ msg: "Registration Success" });
    } catch (error) {
        res.status(504).json({ msg: "Gateway time-out" });
    }
} 

const login = async (req,res)=>{
    try {
        const { phone, password } = req.body;
        const user = await User.findOne({ phone});
        if (!user) return res.status(401).json({ errMsg: "User not found" });
        const passwordCheck =  user.password == sha256(password + process.env.PASSWORD_SALT);
        if (!passwordCheck) return res.status(401).json({ errMsg: "Password doesn't match" });
        if(user.isBanned) return res.status(401).json({errMsg:"You are blocked"});
        const token = generateToken(user._id,'user')

        res.status(200).json({ msg: 'Login succesfull', name: user?.name, token, role: 'user' })
    } catch (error) {
        res.status(504).json({ errMsg: "Gateway time-out" });
    }
}

const allUsers =async (req,res)=>{
    try {
        const userData = await User.find();
        res.status(200).json({ userData });
    } catch (error) {
        res.status(504).json({ errMsg: "Gateway time-out" });
    }
}

const profileDetails = async (req,res)=>{
    try {
        const userData = await User.find({_id:req.payload.id});
        userData ? res.status(200).json({ userData }) : res.status(400).json({ errMsg:'User not found'});
    } catch (error) {
        res.status(504).json({ errMsg: "Gateway time-out" });
    }
}


const editUser = async (req,res)=>{
    const {file,body:{name,email,place}} = req
    try {   
        console.log(req.body,file);
        let image;
        const mimeType = mime.lookup(file.originalname);
        if(mimeType && mimeType.includes("image/")) {
            console.log(process.env.CLOUDINARY_API_KEY);
            const upload = await cloudinary.uploader.upload(file?.path)
            image = upload.secure_url;
            fs.unlinkSync(file.path)
        }else{
            fs.unlinkSync(file.path)
            if(exsistingService) return res.status(400).json({errMsg : 'This file not a image',status:false})
        }
        const userData = await User.findByIdAndUpdate({_id:req.payload.id},{$set:{name:name,email:email,place:place,image:image}});
        console.log(userData);
        userData ? res.status(200).json({msg:'Profile updated successfully', userData }) : res.status(400).json({ errMsg:'User not found'});
    } catch (error) {
        if(file)fs.unlinkSync(file?.path);
        res.status(504).json({ errMsg: "Gateway time-out" });
    }
}


const otpLogin = async (req,res)=>{
    try {
        const {phone} = req.body;
        const user = await User.findOne({ phone});
        if (!user) return res.status(401).json({ errMsg: "User not found" });
        if(user.isBanned) return res.status(401).json({errMsg:"You are blocked"});
        const token = generateToken(user._id,'user')

        res.status(200).json({ msg: 'Login succesfull', name: user?.name, token, role: 'user' })
    } catch (error) {
        res.status(504).json({ errMsg: "Gateway time-out" });
    }
}


const blockUser =async (req,res)=>{
    try {
        const { userId } = req.params;
        const user = await User.findById(userId);
        if (!user) return res.status(400).json({ errMsg: 'User Not Found' })
        user.isBanned = true;
        await user.save()
        res.status(200).json({ msg: 'Unblocked Successfully' })
    } catch (error) {
        res.status(500).json({ errMsg: "Gateway time-out" });
    }
}

const unBlockUser =async (req,res)=>{
    try {
        const { userId } = req.params;
        const user = await User.findById(userId);
        if (!user) return res.status(400).json({ errMsg: 'User Not Found' })
        user.isBanned = false;
        await user.save()
        res.status(200).json({ msg: 'Unblocked Successfully' })
    } catch (error) {
        res.status(500).json({ errMsg: "Gateway time-out" });
    }
}




module.exports = {
    signup,
    login,
    otpLogin,
    allUsers,
    blockUser,
    unBlockUser,
    profileDetails,
    editUser
}