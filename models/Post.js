const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    content : {
        type : String,
        required : true
    },
    category : {
        type : String,
        required : true
    },
    postPhoto :[],
    postVideo : [],
    postType : {
        type : String
    },
    author: {type:mongoose.Schema.Types.ObjectId, ref: 'User' },
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
    likes :  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    dislikes :  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, {
    timestamps : true
})

module.exports = Post = mongoose.model('Post', postSchema);