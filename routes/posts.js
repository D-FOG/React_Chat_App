const router = require("express").Router();
const Post = require("../models/Post");
const User = require("../models/User");
const {verifyToken } = require("./verifyToken");

//create a post
router.post("/", verifyToken, async (req, res) => {
  if(!req.body.userId) return res.status(403).json({
    status: 'error', message: 'user id is required'
  })
  if(typeof req.body.img === 'object' && Object.keys(req.body.img).length !== 0 && (!req.body.img.hasOwnProperty('url') || !req.body.img.hasOwnProperty('filename'))) {
    return res.status(403).json({
      status: 'error', message: 'img propery most be an object type: {url: <string>, filename: <string>}'
    })
  }
  if(req.user.id !== req.body.userId) {
    return res.status(403).json({status: 'error', message: 'you can only post to your account'})
  }
  const newPost = new Post(req.body);
  try {
    const savedPost = await newPost.save();
    res.status(200).json({status: 'ok', data: savedPost});
  } catch(err) { 
    res.status(500).json({status: 'error', error: err});
  }
}); 

//update a post
router.put("/", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.user.id);
    if (post.userId === req.body.userId) {
      await post.updateOne({ $set: req.body });
      res.status(200).json({status: 'ok'});
    } else {
      res.status(403).json({status: 'error', message: "you can update only your post"});
    }
  } catch (err) {
    res.status(500).json(err);
  }
}); 

//delete a post
router.delete("/:postId", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (post.userId === req.user.id) {
      await post.deleteOne();
      res.status(200).json({status: 'ok'})
    } else {
      res.status(403).json({status: 'error', message: "you can delete only your post"});
    }
  } catch (err) {
    res.status(500).json(err);
  }
});

//like / dislike a post
router.put("/:postId/like", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post.likes.includes(req.body.userId)) {
      await post.updateOne({ $push: { likes: req.body.userId } });
      res.status(200).json({status: 'ok'});
    } else {
      await post.updateOne({ $pull: { likes: req.body.userId } });
      res.status(200).json({status: 'ok'});url
    }
  } catch (err) {
    res.status(500).json({status: 'error', error: err});
  }
});

//get a post
router.get("/:postId/single", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    res.status(200).json({status: 'ok', data: post});
  } catch (err) {
    res.status(500).json({status: 'error', error: err});
  }
});

// get posts
router.get("/:userId", verifyToken, async (req, res) => {
  try {
    const userPosts = await Post.find({ userId: req.params.userId }).sort({createdAt: 'desc'});
    res.status(200).json({status: 'ok', data: userPosts})
  } catch (err) {
    res.status(500).json({status: 'error', error: err});
  } 
});

//get timeline posts
router.get("/timeline/all", verifyToken, async(req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    const userPosts = await Post.find({ userId: currentUser._id }).sort({createdAt: 'desc'});
    const friendPosts = await Promise.all(
      currentUser.followings.map((friendId) => {
        return Post.find({ userId: friendId }).sort({createdAt: 'desc'});
      })
    );
    res.status(200).json({status: 'ok', data: userPosts.concat(...friendPosts)})
  } catch (err) {
    res.status(500).json({status: 'error', error: 'an error occured'});
  } 
});

module.exports = router;
