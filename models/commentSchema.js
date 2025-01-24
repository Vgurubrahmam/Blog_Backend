const mongoose = require("mongoose");

const commentSchema = mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "posts", 
      required: true,
    },
    name: {
      type: String,
      required: true,
      maxLength: 100, 
    },
    email: {
      type: String,
      required: true,
      match: /.+\@.+\..+/, 
    },
    comment: {
      type: String,
      required: true,
      maxLength: 500, 
    },
  },
  { timestamps: true } 
);

const CommentModel = mongoose.model("comments", commentSchema);
module.exports = CommentModel;
