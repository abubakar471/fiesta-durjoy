const { Schema, model } = require('mongoose');
const mongoose = require('mongoose');

const commentSchema = new Schema({
    content: { type: String, required: true },
    author: {type:mongoose.Schema.Types.ObjectId, ref: 'User' },
    
}, { timestamps: true });

module.exports = model('Comment', commentSchema);