const router = require('express').Router()
const User = require('../models/User')
const jwt = require('jsonwebtoken')
const CryptoJS = require('crypto-js')

const validateCredentials = (req, res, next) => {
  const {username, password, password1} = req.body

  if(!username || typeof username !== 'string'){
    return res.status(401).json({status: 'error', message: 'Invalid username'})
  }
  if(!password || typeof password !== 'string'){
    return res.status(401).json({status: 'error', message: 'Invalid password'})
  }
  else if(password !== password1){
    return res.status(401).json({status: 'error', message: 'Password does not match'})
  }
  else if(password.length < 5){
    return res.status(401).json({status: 'error', message:'Password too short. Should be at least 5 characters'})
  }
  next() 
}

//REGISTER
router.post("/register", validateCredentials, async (req, res) => {
  const {username, password} = req.body
  const encryptedPass = CryptoJS.AES.encrypt(password, process.env.PASS_ENC_SECT).toString()

  try {
    await User.create({
      username,
      password: encryptedPass,
    })
    res.status(200).json({status:'ok'})
  } catch (err) {
    // duplicate key error
    if(err.code === 11000){
      return res.status(409).json({status: 'error', message: 'Username already exists', error: err})
    }
    res.status(500).json({status: 'error', error: err})
  }
});

//LOGIN
router.post("/login", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.body.username });
    console.log(req.body)

    if(!user) return res.status(404).json({ status: 'error', message: "Invalid Username/Password"});
  
    const hashPassword = CryptoJS.AES.decrypt(user.password, process.env.PASS_ENC_SECT)
    const Originalpassword = hashPassword.toString(CryptoJS.enc.Utf8)
    if (Originalpassword !== req.body.password) return res.status(400).json({status: 'error', message: 'Invalid Username/Password'})

    const {password, ...others} = user._doc

    // generated jwt token login user
    const accessToken = jwt.sign({
      id: user._id,
    }, process.env.JWT_SECT,
      {expiresIn: '2d'}
    )
    res.status(200).json({status:'ok', data: {...others, accessToken}})
  } catch (err) {
    console.log(err, 'This is the error')
    res.status(500).json({status: 'error', message: 'An error occured while trying to login'})
  }
});

module.exports = router;
