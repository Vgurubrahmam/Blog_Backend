const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const argon2 = require("argon2");
const User = require("../models/userSchema");
const Blog = require('../models/blogSchema')
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

app.use(cors);

const PORT = process.env.PORT || 8080;
const secretKey = "guru";

const generateToken = (user) => {
  return jwt.sign({ id: user._id, username: user.username }, secretKey, {
    expiresIn: "7d",
  });
};

mongoose
  .connect("mongodb+srv://Vguru:guru@cluster0.esn1gep.mongodb.net/Blog?retryWrites=true&w=majority&appName=Cluster0")
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

app.listen(PORT, (err) => {
  if (!err) {
    console.log(`Server is running on 'http://localhost:${PORT}`);
  } else {
    console.log("Error occurred, server can't start", err);
  }
});
