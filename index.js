const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const argon2 = require("argon2");
const User = require("./models/userSchema");
const Blog = require('./models/blogSchema')
const jwt = require("jsonwebtoken");
const Comments =require("./models/commentSchema")
const app = express();
app.use(express.json());

app.use(cors());

const secretKey = "guru";

const generateToken = (user) => {
  return jwt.sign({ id: user._id, username: user.username }, secretKey, {
    expiresIn: "7d",
  });
};

mongoose
  .connect("mongodb+srv://Vguru:guru@cluster0.lkgshfk.mongodb.net/Blog?retryWrites=true&w=majority&appName=Cluster0")
  .then(() => console.log("MongoDB connected..."))
  .catch((err) => console.log("MongoDB connection error:", err));

// login
app.post("/login", async (req, res) => {
  console.log("Login request received");
  try {
    const { email, password } = req.body;
    console.log("Request body:", req.body);

    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return res.status(404).send({ message: 'Email is not found.' });
    }

    const isPasswordValid = await argon2.verify(existingUser.password, password);
    if (!isPasswordValid) {
      return res.status(401).send({ message: "Incorrect password." });
    }

    const token = generateToken(existingUser);
    res.status(200).send({ token: token, message: 'User logged in successfully.' });
  } catch (err) {
    console.log("Login error:", err);
    res.status(500).send({ message: "Error logging in." });
  }
});

// signup
app.post("/signup", async (req, res) => {
  console.log("Signup request received");
  try {
    const { email, name, password } = req.body;
    console.log("Request body:", req.body);

    if (!email || !name || !password) {
      return res.status(400).send({ message: "Email, name, and password are required." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).send({ message: "Email or username already exists." });
    }

    const hashedPassword = await argon2.hash(password);

    const newUser = new User({
      email,
      name,
      password: hashedPassword,
    });

    await newUser.save();

    const token = generateToken(newUser);
    res.status(201).send({ token, message: "You have successfully signed up." });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).send({ message: "Error registering user." });
  }
});

// create blog
app.post("/blogs", async (req, res) => {
  console.log("Create blog request received");
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).send({ message: "Authorization token is missing." });
  }

  const values = req.body;
  console.log("Request body:", values);

  try {
    const decoded = jwt.verify(token, secretKey);
    const newBlog = new Blog({
      title: values.title,
      userId: decoded.id,
      description: values.description,
      category: values.category,
      imageurl: values.imageurl,
    });

    await newBlog.save();
    res.status(200).send({ added: true, message: 'Successfully Inserted.', decoded });
  } catch (err) {
    if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
      return res.status(401).send({ message: "Token expired or invalid.", err });
    }
    console.log("Create blog error:", err);
    res.status(500).send({ message: "Internal server error.", err });
  }
});

// get post
app.get("/protectedroutes", async (req, res) => {
  console.log("Get blogs request received");
  try {
    const blogs = await Blog.find().populate("userId", 'name');
    res.status(200).send({ message: "Successfully fetched blogs", blogs: blogs });
  } catch (error) {
    console.error("Error fetching blogs:", error);
    res.status(500).send({ message: "Error occurred while fetching blogs" });
  }
});
app.get("/", async (req, res) => {
  return res.send({'msg' : 'Hello'})
})
// update post
app.patch('/updateposts/:id', async (req, res) => {
  console.log("Update blog request received for ID:", req.params.id);
  const { id } = req.params;
  try {
    const updateData = {
      ...req.body,
      updatedAt: new Date()
    }
    const updatedBlog = await Blog.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });
    if (!updatedBlog) {
      return res.status(404).send({ message: 'Blog post not found.' });
    }
    res.send({ updated: true, blog: updatedBlog });
  } catch (err) {
    console.error("Error updating blog post:", err);
    res.status(500).send({ message: 'Error updating blog post.', err });
  }
});

// delete post
app.delete("/deletepost/:id", async (req, res) => {
  console.log("Delete blog request received for ID:", req.params.id);
  await Blog.findByIdAndDelete(req.params.id);

  try {
    res.status(204).json({
      status: "Success",
      data: {},
    });
  } catch (error) {
    console.error("Error deleting blog post:", error);
    res.status(500).json({
      status: "failed",
      message: error,
    });
  }
});


app.get("/userprofile", async (req, res) => {
  console.log("Get user profile request received");

  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).send({ message: "Authorization token is missing." });
  }

  try {
    const decoded = jwt.verify(token, secretKey);
    const userId = decoded.id;

    const userProfile = await User.findById(userId).select('-password');
    if (!userProfile) {
      return res.status(404).send({ message: "User not found" });
    }

    const userPosts = await Blog.find({ userId: userProfile._id });
    console.log(userPosts);
    
    res.status(200).send({ message: "User profile fetched successfully", user: userProfile, posts: userPosts });
  } catch (error) {
    console.log("Error fetching user profile:", error);
    
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return res.status(401).send({ message: "Token expired or invalid.", error });
    }
    
    res.status(500).send({ message: "Error occurred while fetching user profile." });
  }
});

// commnets post
app.post("/addComments", async (req, res) => {
  console.log("Received request to add comment"); 

  const commentData = req.body;

  if (!commentData.comment || !commentData.postId || !commentData.email || !commentData.name) {
    return res.status(400).send({ message: "All fields are required" });
  }

  try {
    const newComment = new Comments({
      comment: commentData.comment,
      postId: commentData.postId,
      email: commentData.email,
      name: commentData.name,
    });

    await newComment.save();
    res.status(200).send({ message: "Comment added successfully",newComment });
  } catch (err) {
    console.error("Error while saving comment:", err);
    res.status(500).send({ message: "Failed to add comment", error: err.message });
  }
});

// get comment
app.get("/getComments", async (req, res) => {
  console.log("Get comments request received");
  const {postId}=req.query
  try {
    let filter={}
    if(postId){
      filter.postId=postId
    }
    const comments = await Comments.find(filter);
    res.status(200).send({ message: "Successfully fetched comments", comments: comments });
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).send({ message: "Error occurred while fetching comments" });
  }
});

app.listen(8000,()=>{
  console.log("server is running at http://localhost:8000")
})

module.exports = app
