const User = require("../models/User");
const router = require("express").Router();
const {verifyToken} = require('./verifyToken')

const validateUpdateUser = (req, res, next) => {

  console.log(req.body.profilePicture, req.body.coverPicture)
  if(!req.body.username) {
    return res.status(403).json({status: 'error', message:'username is required'})
  }

  if(req.body.password || req.body.followers || req.body.followings) {
    return res.status(400).json({status: 'error'})
  }
  if(req.body.hasOwnProperty('profilePicture') && typeof req.body.profilePicture === 'object' && Object.keys(req.body.profilePicture).length) {
    if(!req.body.profilePicture.hasOwnProperty('url') || !req.body.profilePicture.hasOwnProperty('filename')) 
    {
      return res.status(403).json({
        status: 'error', message: 'profilePicture propetry most be an object type: {url: <string>, filename: <string>}'
      })
    }
  }else if (req.body.hasOwnProperty('profilePicture') && typeof req.body.profilePicture !== 'object') {
    return res.status(403).json({status: 'error', message: 'profilePicture propetry most be an object'})
  } 

  if(req.body.hasOwnProperty('coverPicture') && typeof req.body.coverPicture === 'object' && Object.keys(req.body.coverPicture).length) {
    if(!req.body.coverPicture.hasOwnProperty('url') || !req.body.coverPicture.hasOwnProperty('filename')) 
    {
      return res.status(403).json({
        status: 'error', message: 'coverPicture propetry most be an object type: {url: <string>, filename: <string>}'
      })
    }
  }else if (req.body.hasOwnProperty('coverPicture') && typeof req.body.coverPicture !== 'object') {
    return res.status(403).json({status: 'error', message: 'coverPicture propetry most be an object'})
  }
  next()
}

//update user
router.put("/", verifyToken, validateUpdateUser, async (req, res) => {
    try {
      await User.findByIdAndUpdate(req.user.id, {
        $set: req.body,
      });
      res.status(200).json({status: 'ok'});
    } catch (err) {
      return res.status(500).json({status: 'error', error: err});
    }
  } 
)

// search for users
router.get("/search", verifyToken, async (req, res) => {
  if(req.query.search) {
    const regex = new RegExp(escapeRegex(req.query.search), 'gi')
    try {
      const users = await User.find({username: regex});
      res.status(200).json({status: 'ok', data: users});
    } catch (err) {
      res.status(500).json({status: 'error', error: err});
    }
  }
  else {
    try {
      const users = await User.find({});
      res.status(200).json({status: 'ok', data: users});
    } catch (err) {
      res.status(500).json({status: 'error', error: err});
    }
  }
});


//delete user
router.delete("/", verifyToken, async (req, res) => {
    try {
      await User.findByIdAndDelete(req.user.id);
      res.status(200).json({status: 'ok'});
    } catch (err) {
      return res.status(500).json({status: 'error', error: err});
    }
}) 

//get a user using the id in the user token
router.get("/", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const { password, updatedAt, ...other } = user._doc;
    res.status(200).json({status: 'ok', data: other});
  } catch (err) {
    res.status(500).json({status: 'error', error: err});
  }
});


// get a user by id in paramerter
router.get("/:id/user", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if(!user) return res.status(404).json({status: 'error' , message: 'User not found'})
    const { password, updatedAt, ...other } = user._doc;
    res.status(200).json({status: 'ok', data: other});
  } catch (err) {
    res.status(500).json({status: 'error', error: err});
  }
});

// get followers
router.get('/followers', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const followers = await Promise.all(user.followers.map(async (id) => {
      const follower = await User.findById(id)
      const following = follower.followers.includes(req.user.id) // check if following this user
      return {
        id: follower._id,
        username: follower.username,
        image: follower.profilePicture,
        following
      }
    }))
    res.status(200).json({status: 'ok', data: followers})
  }catch(err) {
    res.status(500).json({status: 'error', message:"unable to get followers"});
  } 
})

// get following
router.get('/following', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const following = await Promise.all(user.followings.map(async (id) => {
      const follow = await User.findById(id) 
      return {
        id: follow._id,
        username: follow.username,
        image: follow.profilePicture,
      }
    }))
    res.status(200).json({status: 'ok', data: following})
  }catch(err) {
    res.status(500).json({status: 'error', message:"unable to get following"});
  } 
})

//follow a user
router.put("/follow", verifyToken, async (req, res) => {
  if(!req.body.userId) return res.status(400).json({status: 'error', message: 'Missing payload property'})
  try {
    const user = await User.findById(req.body.userId);
    const currentUser = await User.findById(req.user.id);
    if (!user.followers.includes(req.user.id)) {
      await user.updateOne({ $push: { followers: req.user.id } });
      await currentUser.updateOne({ $push: { followings: req.body.userId } });
      res.status(200).json({status: 'ok', message: "user has been followed"});
    } else {
      res.status(403).json({status: 'error', message:"you already follow this user"});
    }
  } catch (err) {
    res.status(500).json({status: 'error', error: err});
  }
})

//unfollow a user
router.put("/unfollow", verifyToken, async (req, res) => {
  if(!req.body.userId) return res.status(400).json({status: 'error', message: 'Missing payload property'})
  try {
    const user = await User.findById(req.body.userId);
    const currentUser = await User.findById(req.user.id);
    if (user.followers.includes(req.user.id)) {
      await user.updateOne({ $pull: { followers: req.user.id } });
      await currentUser.updateOne({ $pull: { followings: req.body.userId } });
      res.status(200).json("user has been unfollowed");
    } else {
      res.status(403).json("you don't follow this user");
    }
  } catch (err) {
    res.status(500).json({status: 'error', error: err});
  }
})

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

module.exports = router;
