const express = require("express");
const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');
const jsonwebtoken = require('jsonwebtoken');
const User = require('./models/usermodal.js'); 
const cors = require('cors');
const Blog = require("./models/createSchemaModal"); 
const verifytoken = require('./models/verifyToken');

mongoose.connect("mongodb://localhost:27017/blog")
    .then(() => {
        console.log("Database connection successful");
    })
    .catch((error) => {
        console.error("Database connection error:", error);
    });

const app = express();
app.use(express.json());
app.use(cors());

const secretKey = 'gurus'

// Signup route
app.post("/signup", async (req, res) => {
    let user = req.body;

    try {
        const salt = await bcryptjs.genSalt(16);
        user.password = await bcryptjs.hash(user.password, salt);
        let doc = await User.create(user); 
        res.status(201).send({ message: "User registered" });
    } catch (error) {
        console.error("Error during user registration:", error);
        res.status(500).send({ message: "Some problem occurred" });
    }
});
const generateToken = (user) => {
    return jsonwebtoken.sign({id : user._id, email : user.username}, secretKey, {expiresIn : '7d'})
}
// Login route
app.post("/login", async (req, res) => {
    let usecred = req.body;

    try {
        const user = await User.findOne({ email: usecred.email });
        if (user) {
            const isPasswordCorrect = await bcryptjs.compare(usecred.password, user.password);
            if (isPasswordCorrect) {
                const token = generateToken(user)
                res.send({message : 'Login Successful', token : token})
            } else {
                res.status(403).send({ message: "Incorrect password" });
            }
        } else {
            res.status(404).send({ message: "User not found" });
        }
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).send({ message: "Some problem occurred" });
    }
});

// Create blog route
app.post("/blogs", async (req, res) => {
    const token=req.header("Authorization")?.replace("Bearer ","")
    if(!token){
        return res.status(401).send({message: "Authorization token missing"})
    }


    try {
        const createcred = req.body
        const decoded=jsonwebtoken.verify(token,secretKey)
        const newBlog=new blogSchema({
            title:createcred.title,
            userId:decoded.id,
            description:createcred.description,
            imageurl:createcred.imageurl,
            category:createcred.category
        })  
        await newBlog.save();
        res.status(201).send({added:true, message: "Post created",decoded});
    } catch (error) {
        if(error.name=== "TokenExpiredError"|| error.name==="JsonWebTokenError"){

        console.error("Error creating blog post:", error);
        res.status(500).send({ message: "Failed to create post" });
    }}
});

// Protected route to fetch blogs


//delete-blog
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

app.listen(8000, () => {
    console.log("Server is running on port 8000");
});