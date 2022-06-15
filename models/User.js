const bcrypt = require('bcrypt')
const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        unique: true,
        required: true
    },
    profession: {
        type : String,
        default : 'None',
        required : true
    },
    address: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    facebook: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true,
    },
    profilePhoto: {
        type: String,
        default: '/uploads/default_profile.jpg',
        required: true
    },
    coverPhoto: {
        type: String,
        default: '/uploads/default_cover.png',
        required: true
    },
    posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    notifications: [{
        content: { type: String },
        link : { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdAt : {type: String}
    }],
}, {
    timestamps: true
})

// UserSchema.pre('save', function (next) {
//     const user = this

//     bcrypt.hash(user.password, 10, function (error, encrypted) {
//         user.password = encrypted
//         next()
//     })
// })

module.exports = User = mongoose.model('User', UserSchema);