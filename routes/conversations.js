const router = require("express").Router();
const Conversation = require("../models/Conversation");
const {verifyToken} = require("./verifyToken");

// new conversations
router.post('/', verifyToken, async(req, res) => {

  if(!req.body.senderId || !req.body.receiverId) {
    return res.status(403).json({status: 'error', message: 'the senderId and recieverId must be included in the request body'})
  }

  if(req.body.senderId !== req.user.id && req.body.receiverId !== req.user.id) {
    return res.status(403).json({status: 'error', message: 'you must be included in this conversation'})
  }
 
  const newConversation = new Conversation({
    members: [req.body.senderId, req.body.receiverId]
  })
  try {
    const conversation = await Conversation.findOne({
      members: {$in: [req.user.id]}
    })
    if(conversation) return res.status(200).json({status: 'ok', data: conversation})
    const savedConversation = await newConversation.save()
    res.status(200).json({status: 'ok', data: savedConversation})
  }catch(err) {
    res.status(500).json({status: 'error', error: err})
  }
})

// get conversation of a user
router.get('/', verifyToken, async(req, res) => {
  try{  
    const conversation = await Conversation.find({
      members: {$in: [req.user.id]}
    })
    res.status(200).json({status: 'ok', data: conversation})
  }catch(err) {
    res.status(500).json({status: 'error', error: err})
  }
})

module.exports = router