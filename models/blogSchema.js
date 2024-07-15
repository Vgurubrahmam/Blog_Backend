const mongoose = require('mongoose');

const blogSchema=mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"users",
        required:true
    },
    title:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    imageurl:{
        type:String,
        required:true
    },
    category:{
        type:String,
        required:true

    }
},{timestamps:true})

const createSchemamodal=mongoose.model("blogs",blogSchema)
module.exports=createSchemamodal
