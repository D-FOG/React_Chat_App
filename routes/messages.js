const router = require("express").Router();
const Message = require("../models/Message");
const {verifyToken } = require("./verifyToken");

// add a message
router.post('/', verifyToken, async(req, res) => {
  const newMessage = new Message(req.body) 
  try{
    const savedMessage = await newMessage.save()
    res.status(200).json({status: 'ok', data: savedMessage})
  }catch(err) {
    res.status(500).json({status: 'error', error: err})
  }
})

// get all messages
router.get('/:conversationId', verifyToken, async(req, res) => {
  try {
    const messages = await Message.find({
      conversationId: req.params.conversationId
    })
    res.status(200).json({status: 'ok', data: messages})
  }catch(err) {
    res.status(500).json({status: 'error', error: err})
  }
})

// get the lastes message
router.get('/:conversationId/message', verifyToken, async(req, res) => {
  try {
    const message = await Message.findOne({conversationId: req.params.conversationId}, {}, { sort: { 'created_at' : -1 } })
    res.status(200).json({status: 'ok', data: message})
  }catch(err) {
    res.status(500).json({status: 'error', error: err})
  }
})

module.exports = router 