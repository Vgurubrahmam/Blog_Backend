const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const argon2 = require("argon2");
const User = require("../models/userSchema");
const Blog = require('../models/blogSchema')
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());
app.use(cors());
const PORT = process.env.PORT || 8080;
const secretKey = "guru";

const generateToken = (user) => {
  return jwt.sign({ id: user._id, username: user.username }, secretKey, {
    expiresIn: "7d",
  });
};

mongoose
  .connect("mongodb+srv://gurubrahmamvelpula531:guru@cluster0.tusxhsk.mongodb.net/Blog?retryWrites=true&w=majority&appName=Cluster0")
  .then(() => console.log("MongoDB connected..."))
  .catch((err) => console.log(err));

  // login
  app.post("/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const existingUser = await User.findOne({ email });
      if (!existingUser) {
        return res.status(404).send({message : 'Email is not found.'});
      }
  
      const isPasswordValid = await argon2.verify(
        existingUser.password,
        password
      );
      if (!isPasswordValid) {
        return res.status(401).send({message : "Incorrect password."});
      }
      const token = generateToken(existingUser);
      res.status(200).send({ token : token, message : 'User logged in successfully.' });
    } catch (err) {
      console.log(err);
      res.status(500).send({message : "Error logging in."});
    }
  });

  // signup
  app.post("/signup", async (req, res) => {
    try {
      const { email, name, password } = req.body;
  
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
      console.error(err);
      res.status(500).send({ message: "Error registering user." });
    }
  });

  // create blog
  app.post("/blogs", async (req, res) => {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).send({ message: "Authorization token is missing." });
    }
  
    const values = req.body;
    
    try {
      const decoded = jwt.verify(token, secretKey);
      const newBlog = new Blog({
        title: values.title,
        userId : decoded.id,
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
      console.log(err)
      res.status(500).send({ message: "Internal server error.", err });
    }
  });
  
// get post

app.get("/protectedroutes", async (req, res) => {
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
  const {id} = req.params
  try {
    const updateData = {
      ...req.body,
      updatedAt : new Date()
    }
    const updatedBlog = await Blog.findByIdAndUpdate(id, updateData, {
      new : true,
      runValidators : true,
    })
    if (!updatedBlog) {
      return res.status(404).send({message : 'Blog post not found.'})
    }
    res.send({updated : true, blog : updatedBlog})
  } catch (err) {
    res.status(500).send({message : 'Error updating blog post.', err})
  }
})



// delete post
app.delete("/deletepost/:id",async (req,res)=>{
  await Blog.findByIdAndDelete(req.params.id);

  try{
      res.status(204).json({
          status:"Success",
          data:{},
      })
  }catch(error){
      res.status(500).json({
          status:"falied",
          message:error,
      })
  }
})

// app.get("/verify", async (req, res) => {
//   const token = req.header("Authorization")?.replace("Bearer ", "");

//   if (!token) {
//     return res.status(401).send("Access denied. No token provided.");
//   }

//   try {
//     const decoded = jwt.verify(token, secretKey);
//     return res.status(200).send({ valid: true, decoded });
//   } catch (error) {
//     if (error.name === "TokenExpiredError") {
//       return res
//         .status(401)
//         .send({ valid: false, error: "Token has expired." });
//     } else if (error.name === "JsonWebTokenError") {
//       return res.status(401).send({ valid: false, error: "Invalid token." });
//     } else {
//       return res
//         .status(400)
//         .send({ valid: false, error: "Token verification failed." });
//     }
//   }
// });


app.listen(PORT, (err) => {
  if (!err) {
    console.log(`Server is running on 'http://localhost:${PORT}`);
  } else {
    console.log("Error occurred, server can't start", err);
  }
});