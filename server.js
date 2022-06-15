const express = require('express');
const app = express();
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const hbs = require('hbs');
const PORT = process.env.PORT || 3000;
const DATABASE = process.env.DATABASE || 'mongodb://localhost:27017/pgbrothers';
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
require('dotenv').config();
const path = require('path');
const cors = require('cors');
const cloudinary = require('./cloudinary');
const fs = require('fs');

// handle upload
var storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, 'public/uploads')
    },
    filename: (req, file, callback) => {
        callback(null, file.fieldname + '-' + Date.now() + 'durjoy' + path.extname(file.originalname));
    }
})
var upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {

        // The function should call `cb` with a boolean
        // to indicate if the file should be accepted

        // To reject this file pass `false`, like so:
        if (file.mimetype !== 'image/jpeg' && file.mimetype !== 'video/mp4') {
            cb(null, false)
        } else {
            // To accept the file pass `true`, like so:
            cb(null, true)
        }



    }

})


const checkAuth = (req, res, next) => {
    console.log('checking authentication');
    if (typeof req.cookies.nToken === 'undefined' || req.cookies.nToken === null) {
        req.user = null;
        console.log('no token')
    } else {
        const token = req.cookies.nToken;
        const decodedToken = jwt.decode(token, { complete: true }) || {};
        console.log('token found')
        req.user = decodedToken.payload;
    }

    next();
}


// middlewares
app.use(express.static(__dirname + '/public'));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(checkAuth);
// database
mongoose.connect(process.env.DATABASE)
    .then(() => console.log('successfully connected to the database'))
    .catch((err) => console.log('database error => %s', err))


// schema models
const Post = require('./models/Post');
const Comment = require('./models/Comment');
const User = require('./models/User');

// view engine
app.set('view engine', 'hbs');
hbs.registerPartials(__dirname + '/views/layouts');

// routes
app.get('/', async (req, res) => {
    const currentUser = req.user;
    var on_sale_posts = await Post.find({ postType: "on-sale" }).lean().sort({ 'createdAt': -1 }).populate('author').limit(6);
    var coming_soon_posts = await Post.find({ postType: "coming-soon" }).lean().sort({ 'createdAt': -1 }).populate('author').limit(6);
    console.log(on_sale_posts)
    Post.find({}).lean().sort({ 'createdAt': -1 }).limit(10).populate('author')
        .then((posts) => {
            console.log(posts)
            res.render('home', {
                pageTitle: "Home",
                posts,
                currentUser,
                on_sale_posts,
                coming_soon_posts
            })
        })
        .catch((err) => {
            console.log(err.message);
        })


});

app.get('/all-posts', async (req, res) => {
    const currentUser = req.user;
    var on_sale_posts = await Post.find({ postType: "on-sale" }).lean().sort({ 'createdAt': -1 }).populate('author').limit(6);
    var coming_soon_posts = await Post.find({ postType: "coming-soon" }).lean().sort({ 'createdAt': -1 }).populate('author').limit(6);
    console.log(on_sale_posts)
    Post.find({}).lean().sort({ 'createdAt': -1 }).populate('author')
        .then((posts) => {
            console.log(posts)
            res.render('all_posts', {
                pageTitle: "All Posts",
                posts,
                currentUser,
                on_sale_posts,
                coming_soon_posts
            })
        })
        .catch((err) => {
            console.log(err.message);
        })


});

app.get('/me', async (req, res) => {
    // currentUser = req.user;
    if (req.user) {
        res.redirect(`/profile/${req.user._id}`);
    } else {
        res.redirect('/signin');
    }

})

app.get('/profile/:id', async (req, res) => {

    currentUser = req.user;
    if (currentUser) {
        if (currentUser._id === req.params.id) {
            var user = await User.findById({ '_id': currentUser._id });
            if (user) {
                var posts = [];

                for (let i = 0; i < user.posts.length; i++) {
                    var post = await Post.findById({ '_id': user.posts[i] }).lean().sort({ 'createdAt': -1 }).populate('author')
                    posts.push(post);
                }
                console.log(user)
                res.render('auth_profile', {
                    pageTitle: user.username,
                    user,
                    currentUser,
                    posts
                })
            }
        } else {
            var user = await User.findById({ '_id': req.params.id });
            var posts = [];
            var followed = String(user.followers).includes(currentUser._id);
            for (let i = 0; i < user.posts.length; i++) {
                var post = await Post.findById({ '_id': user.posts[i] }).lean().sort({ 'createdAt': -1 }).populate('author')
                posts.push(post);
            }
            res.render('view_profile', {
                pageTitle: user.username,
                user,
                currentUser,
                posts,
                followed
            })
        }
    } else {
        var user = await User.findById({ '_id': req.params.id });
        var posts = [];

        for (let i = 0; i < user.posts.length; i++) {
            var post = await Post.findById({ '_id': user.posts[i] }).lean().sort({ 'createdAt': -1 }).populate('author')
            posts.push(post);
        }
        res.render('view_profile', {
            pageTitle: user.username,
            user,
            currentUser,
            posts
        })
    }

})

app.get('/edit-profile', async (req, res) => {
    const currentUser = req.user;
    if(req.user){
        var user = await User.findById(currentUser._id);
    res.render('edit_profile', {
        pageTitle: user.username + ' ' + '-Edit Profile',
        user,
        currentUser
    })
    } else{
        res.redirect('/signin');
    }
})

app.get('/signup', (req, res) => {
   var currentUser = req.user;
   if(currentUser){
       res.redirect('/me');
   } else{
    res.render('signup', {
        pageTitle: "create a new account"
    })
   }
})

app.get('/signin', async (req, res) => {
    var currentUser = req.user;
    if(currentUser){
        res.redirect("/me");
    } else{
        res.render('signin', {
            pageTitle: "signin"
        })
    }
})
app.get('/signout', (req, res) => {
    res.clearCookie('nToken');
    res.redirect('/');
})

app.get('/add-post/:id', async (req, res) => {
    currentUser = req.user;
    var user = await User.findById({ '_id': req.params.id });
    res.render('add_post', {
        pageTitle: user.username + " " + 'Add a new post',
        currentUser,
        user
    });
})

app.get('/posts/:id', async (req, res) => {
    const currentUser = req.user;
    var post = await Post.findById(req.params.id).lean().populate('author').populate({ path: 'comments', populate: { path: 'author' } });
    var postUserId = post.author._id.toString();
    var likes = post.likes.length;
    var dislikes = post.dislikes.length;
    console.log(post);


    if (!currentUser) {
        res.render('show_post_view', {
            pageTitle: post.content,
            post,
            likes,
            dislikes
        })
    } else {
        var post_liked = String(post.likes).includes(currentUser._id);
        var post_disliked = String(post.dislikes).includes(currentUser._id);
        var followed = String(post.author.followers).includes(currentUser._id);
        console.log(followed)
        if (currentUser._id.toString() === postUserId) {
            console.log('executed')
            res.render('show_post_auth', {
                pageTitle: post.content,
                post,
                currentUser,
                likes,
                dislikes,
                liked: post_liked,
                disliked: post_disliked,
                followed: followed
            })
        } else {
            res.render('show_post_view', {
                pageTitle: post.content,
                post,
                currentUser,
                likes,
                dislikes,
                liked: post_liked,
                disliked: post_disliked,
                followed: followed
            })
        }
    }

})

app.get('/posts/:userid/edit/:id', async (req, res) => {
    var currentUser = req.user;
    var post = await Post.findById(req.params.id).lean().populate('author');
    console.log(post);
    res.render('edit_post', {
        pageTitle: post.content,
        currentUser,
        post
    });
})

app.get('/profile/followers/:userId', async (req, res) => {
    var user = await User.findById(req.params.userId).populate('followers');
    res.render('followers_view', {
        pageTitle: user.username,
        user,
        currentUser: req.user
    })
})

app.get('/profile/following/:userId', async (req, res) => {
    var currentUser = req.user;
    var user = await User.findById(req.params.userId).lean().populate('following');
    console.log(user);

    if (!currentUser) {
        res.render('following_view_view', {
            pageTitle: user.username,
            user,
            valid: false
        })
    } else {
        console.log(String(currentUser._id));
        console.log(String(req.params.userId));
        var ouu = String(currentUser._id) === String(req.params.userId);

        if (String(currentUser._id) === String(req.params.userId)) {

            res.render('following_view_auth', {
                pageTitle: user.username,
                user,
                currentUser
            })
        }
        else {
            res.render('following_view_view', {
                pageTitle: user.username,
                user,
                currentUser,

            })
        }
    }

})

app.get('/notifications', async (req, res) => {
    var currentUser = req.user;
    if (!currentUser) {
        res.render('404', {
            pageTitle: "Not Found"
        })
    } else {
        var user = await User.findById(currentUser._id).populate({ path: 'notifications', populate: { path: 'link' } });
        console.log(user);
        res.render('notifications', {
            pageTitle: "Notifications",
            currentUser,
            user
        })
    }
})

app.get("/developers", (req,res) => {
    res.render("developers",{
        pageTitle : "Developer | Durjoy"
    })
})

app.post('/signup', async (req, res) => {
    
    const { username, email, password, facebook, address, phone } = req.body;
    if(!username || !email || !password || !facebook || !address || !phone){
        res.render('signup', {
            pageTitle: 'create a new account',
            message: 'Please Fill All Fields',
           
        })
    }
    var user = await User.findOne({ 'email': email });
    if (user) {
        res.render('signup', {
            pageTitle: 'create a new account',
            message: 'email already exists. please sign in to continue.',
            classList: 'failed-msg'
        })
    } else {
        bcrypt.hash(password, 10)
            .then(async (hashed) => {
                var newUser = new User({
                    'email': req.body.email,
                    'password': hashed,
                    'username': req.body.username,
                    'facebook': req.body.facebook,
                    'address': req.body.address,
                    'phone': req.body.phone
                });
                await newUser.save()
                    .then((user) => {
                        const token = jwt.sign(
                            { _id: user._id },
                            process.env.SECRET,
                            { expiresIn: '60 days' }
                        );
                        res.cookie('nToken', token, { maxAge: 900000, httpOnly: true });
                        return res.redirect('/')

                    })
                    .catch(err => console.log(err))
            })
            .catch(err => console.log(err))
    }
})

app.post('/signin', async (req, res) => {

    const { email, password } = req.body;
    console.log('email => %s', email);
    console.log('password => %s', password);
    if (!email || !password) {
        res.render('signin', {
            pageTitle: 'sign in',
            classList: 'failed-msg',
            message: "please fill all of the fields"
        })
    }
    try {
        var user = await User.findOne({ 'email': email });

        if (user) {
            if (await bcrypt.compare(password, user.password)) {
                // req.session.user = user;
                const token = jwt.sign({ _id: user._id, username: user.username }, process.env.SECRET, {
                    expiresIn: '60 days',
                });
                // Set a cookie and redirect to root
                res.cookie('nToken', token, { maxAge: 900000, httpOnly: true });
                res.redirect('/');
            } else {
                res.render('signin', {
                    pageTitle: 'sign in',
                    classList: 'danger-msg',
                    message: "incorrect password"
                })
            }
        } else {
            res.render('signin', {
                pageTitle: 'sign in',
                message: 'Invalid email or password',
                classList: "danger-msg"
            })
        }

    } catch (e) {
        console.log(e);
    }
})

app.post('/edit-profile/:id', upload.fields([{
    name: 'profilePhoto', maxCount: 1
}, {
    name: 'coverPhoto', maxCount: 1
}]), async (req, res) => {
    const currentUser = req.user;
    if (!currentUser) {
        res.redirect("/signin", {
            pageTitle: "Sign In"
        })
    } else {
        try {
            var user = await User.findById({ '_id': req.params.id });
            const { username, email, password, profession, facebook, address, phone, profilePhoto, coverPhoto } = req.body;
            var url = req.params.id;

            const uploader = async (path) => await cloudinary.uploads(path, 'Images');
            const coverUploader = async (coverPath) => await cloudinary.coverUploads(coverPath, "Images");

            var { path } = req.files.profilePhoto[0];
            var coverPath = req.files.coverPhoto[0].path;

            console.log(path);
            console.log(coverPath);

            const newPath = await uploader(path);
            const newCoverPath = await coverUploader(coverPath);

            console.log(newPath);
            console.log(newCoverPath)
            fs.unlinkSync(path);
            fs.unlinkSync(coverPath);

            var updates = {
                username,
                email,
                profession,
                password,
                facebook,
                address,
                phone,
                profilePhoto : newPath.url,
                coverPhoto : newCoverPath.url
            }
            await User.findByIdAndUpdate(url, updates);
          
            res.redirect(`/profile/${req.user._id}`);
        }
        catch (err) {
            var user = await User.findById({ '_id': req.params.id });
            const { username, email, password, profession, facebook, address, phone, profilePhoto, coverPhoto } = req.body;

            var url = req.params.id;
            var updates = {
                username,
                email,
                profession,
                password,
                facebook,
                address,
                phone,
                profilePhoto: user.profilePhoto,
                coverPhoto: user.coverPhoto
            }
            await User.findByIdAndUpdate(url, updates);
            res.redirect(`/profile/${req.user._id}`);
        }
    }
})

app.post('/add-post/:id', upload.array('postPhoto'), async (req, res) => {
    const uploader = async (path) => await cloudinary.uploads(path, 'Images');
    const { content, category, postType } = req.body;
    var currentUser = req.user;

    postPhotos = [];
    postVideos = [];

    for (let i = 0; i < req.files.length; i++) {
        if (req.files[i].mimetype === 'image/jpeg') {
            var { path } = req.files[i];
            console.log(path)
            const newPath = await uploader(path);
            postPhotos.push(newPath);
            fs.unlinkSync(path);
        }
        if (req.files[i].mimetype === 'video/mp4') {
            var { path } = req.files[i];
            const newPath = await uploader(path);
            postVideos.push(newPath);
            fs.unlinkSync(path);
        }
    }

    console.log(postPhotos);
    console.log(postVideos)








    const newPost = new Post({ content, category, postType, postPhoto: postPhotos, postVideo: postVideos, author: req.user._id });
    var user = await User.findById({ '_id': currentUser._id });

    await newPost.save()
        .then(async (post) => {
            user.posts.unshift(post._id);
            user.save();

        })
        .then(() => {
            res.redirect(`/profile/${req.user._id}`);
        })
        .catch((err) => {
            res.end(err)
        })
})

app.post('/posts/:userid/delete/:id', async (req, res) => {
    var user = await User.findById(req.params.userid);
    var posts = await user.posts;
    var postIndex = await posts.indexOf(req.params.id);
    var post = await Post.findById(req.params.id).lean().populate('author');
    var currentUser = req.user;

    if (post.author._id.toString() === currentUser._id.toString()) {
        await Post.findByIdAndRemove(req.params.id)
            .then(async () => {
                posts.splice(postIndex, 1)
                var updates = {
                    posts: posts
                }
                await User.findByIdAndUpdate(req.params.userid, updates);

                res.redirect(`/profile/${req.params.userid}`)
            })
            .catch((err) => {
                // res.redirect(`/profile/${req.params.userid}`)
            })
    } else {
        res.end('<h1>Invalid Request</h1>')
    }

})

app.post('/posts/:userid/edit/:id', async (req, res) => {
    var currentUser = req.user;
    var post = await Post.findById(req.params.id).lean().populate('author');
    console.log(post);
    var updates = {
        content: req.body.content
    }

    if (post.author._id.toString() === currentUser._id.toString()) {
        await Post.findByIdAndUpdate(req.params.id, updates);
        res.redirect(`/posts/${post._id}`)
    } else {
        res.end('<h1>Invalid Request</h1>')
    }

})

app.post('/posts/:postId/comments', async (req, res) => {
    // INSTANTIATE INSTANCE OF MODEL
    var currentUser = req.user;
    var post = await Post.findById(req.params.postId).lean().populate('author').populate({ path: 'comments', populate: { path: 'author' } });


    if (!currentUser) {
        res.render('show_post_view', {
            pageTitle: post.content,
            message: 'please sign in to comment',
            post,
            likes: post.likes.length,
            dislikes: post.dislikes.length
        })
    } else {
        const comment = new Comment(req.body);

        comment.author = currentUser._id;
        // SAVE INSTANCE OF Comment MODEL TO DB
        comment
            .save()
            .then(async () => {
                await Post.findById(req.params.postId)
                    .then((post) => {
                        post.comments.unshift(comment);
                        return post.save();
                    })
                    .then(() => res.redirect(`/posts/${req.params.postId}`))
                    .catch((err) => {
                        console.log(err);
                    })
            });
    }
});

// app.post('/likes/:postId', async (req, res) => {
//     var currentUser = req.user;
//     if (currentUser) {
//         var post = await Post.findById(req.params.postId).populate('author');
//         var likes = post.likes;
//         var dislikes = post.dislikes;
//         var postIndex = likes.indexOf(currentUser._id);

//         if (dislikes.includes(currentUser._id)) {
//             dislikes.splice(postIndex, 1);

//             likes.unshift(currentUser._id);
//             post.save()
//                 .then(() => {
//                     res.redirect(`/posts/${req.params.postId}`)


//                 })

//         } else {
//             if (likes.includes(currentUser._id)) {

//                 likes.splice(postIndex, 1);
//                 post.save()
//                     .then(() => {
//                         res.redirect(`/posts/${req.params.postId}`)
//                     })
//             } else {

//                 likes.unshift(currentUser._id);
//                 post.save()
//                     .then(() => {
//                         res.redirect(`/posts/${req.params.postId}`)


//                     })


//             }
//         }


//     } else {
//         var post = await Post.findById(req.params.postId).lean().populate('author').populate({ path: 'comments', populate: { path: 'author' } });

//         res.render('show_post_view', {
//             pageTitle: post.content,
//             post,
//             like_error_message: 'please sign in to react',
//             color: 'red',
//             likes: post.likes.length
//         })
//     }
// })


app.post('/likes/:postId', async (req, res) => {
    var currentUser = req.user;
    if (!currentUser) {
        res.redirect('/signin');
    } else {
        var post = await Post.findById(req.params.postId).populate('author');
        var likes = post.likes;
        var dislikes = post.dislikes;
        var postIndexLikes = likes.indexOf(currentUser._id);
        var postIndexDislikes = dislikes.indexOf(currentUser._id);

        if (!likes.includes(currentUser._id)) {
            likes.unshift(currentUser._id);

            if (dislikes.includes(currentUser._id)) {
                dislikes.splice(postIndexDislikes, 1);
            }
            post.save()
                .then(() => res.redirect(`/posts/${req.params.postId}`))
        } else {
            likes.splice(postIndexLikes, 1);
            if (dislikes.includes(currentUser._id)) {
                dislikes.splice(postIndexDislikes, 1);
            }
            post.save()
                .then(() => res.redirect(`/posts/${req.params.postId}`))
        }

    }
})

app.post('/dislikes/:postId', async (req, res) => {
    var currentUser = req.user;
    if (currentUser) {
        var post = await Post.findById(req.params.postId).populate('author');
        var likes = post.likes;
        var dislikes = post.dislikes;
        var postIndex = dislikes.indexOf(currentUser._id);

        if (likes.includes(currentUser._id)) {
            likes.splice(post.likes.indexOf(currentUser._id), 1);

            dislikes.unshift(currentUser._id);
            post.save()
                .then(() => {
                    res.redirect(`/posts/${req.params.postId}`);
                })


        } else {
            if (dislikes.includes(currentUser._id)) {

                dislikes.splice(postIndex, 1);
                post.save()
                    .then(() => {
                        res.redirect(`/posts/${req.params.postId}`);
                    })
            } else {

                dislikes.unshift(currentUser._id);
                post.save()
                    .then(() => {
                        res.redirect(`/posts/${req.params.postId}`);
                    })


            }
        }

    } else {
        var post = await Post.findById(req.params.postId).lean().populate('author').populate({ path: 'comments', populate: { path: 'author' } });

        res.render('show_post_view', {
            pageTitle: post.content,
            post,
            like_error_message: 'please sign in to react',
            color: 'red',
            likes: post.likes.length,
            dislikes: post.dislikes.length
        })
    }
})

app.post('/follow/:userId/:postId', async (req, res) => {
    var currentUser = req.user;
    var post = await Post.findById(req.params.postId).lean().populate('author').populate({ path: 'comments', populate: { path: 'author' } });
    var user = await User.findById(req.params.userId);

    var followers = user.followers;
    var following = user.following;

    if (!currentUser) {
        res.render('show_post_view', {
            pageTitle: post.content,
            post,
            follow_error_message: 'please sign in to follow'
        })
    } else {
        var user2 = await User.findById(currentUser._id);

        if (user2.following.includes(req.params.userId)) {
            var userIndex = user2.following.indexOf(req.params.userId);
            user2.following.splice(userIndex, 1);
            user2.save()
                .then(() => {
                    res.redirect(`/posts/${req.params.postId}`);
                })

        } else {
            followers.unshift(currentUser._id);
            var user_2 = await User.findById(currentUser._id);
            user.notifications.unshift({
                'content': user_2.username + ' ' + 'started following you',
                'link': user_2._id,
                'createdAt': new Date().toDateString()
            });
            user.save()
                .then(() => {
                    user_2.following.unshift(user._id);
                    user_2.save();
                })
                .then(() => {
                    res.redirect(`/posts/${req.params.postId}`);
                })
        }
    }
})


app.post('/unfollow/:userId/:postId', async (req, res) => {
    const currentUser = req.user;
    if (!currentUser) {
        res.end('invaild request')
    } else {
        var mainUser = await User.findById(currentUser._id);
        var userToUnfollow = await User.findById(req.params.userId);
        var following = mainUser.following;
        var followers = userToUnfollow.followers;

        var userIndex = following.indexOf(req.params.userId);
        following.splice(userIndex, 1);
        var notification_index = userToUnfollow.notifications.includes(currentUser._id);
        userToUnfollow.notifications.splice(notification_index, 1);
        mainUser.save()
            .then(() => {
                var userIndex2 = followers.indexOf(currentUser._id);
                followers.splice(userIndex2, 1);
                userToUnfollow.save()
                    .then(() => {
                        res.redirect(`/posts/${req.params.postId}`);
                    })
            })
    }
})

app.post('/follow/:userId', async (req, res) => {
    var currentUser = req.user;
    var post = await Post.findById(req.params.postId).lean().populate('author').populate({ path: 'comments', populate: { path: 'author' } });
    var user = await User.findById(req.params.userId);

    var followers = user.followers;
    var following = user.following;

    if (!currentUser) {
        res.redirect('/signin');
    } else {
        var user2 = await User.findById(currentUser._id);

        if (user2.following.includes(req.params.userId)) {
            var userIndex = user2.following.indexOf(req.params.userId);
            user2.following.splice(userIndex, 1);
            user2.save()
                .then(() => {
                    res.redirect(`/profile/${req.params.userId}`);
                })

        } else {
            followers.unshift(currentUser._id);
            var user_2 = await User.findById(currentUser._id);
            user.notifications.unshift({

                'content': user_2.username + ' ' + 'started following you',
                'link': user_2._id,
                'createdAt': new Date().toDateString()
            });

            user.save()
                .then(() => {
                    user_2.following.unshift(user._id);
                    user_2.save();
                })
                .then(() => {
                    res.redirect(`/profile/${req.params.userId}`);
                })
        }
    }
})

app.post('/unfollow/:userId', async (req, res) => {
    const currentUser = req.user;
    if (!currentUser) {
        res.end('invaild request')
    } else {
        var mainUser = await User.findById(currentUser._id);
        var userToUnfollow = await User.findById(req.params.userId);
        var following = mainUser.following;
        var followers = userToUnfollow.followers;

        var userIndex = following.indexOf(req.params.userId);
        following.splice(userIndex, 1);
        var notification_index = userToUnfollow.notifications.includes(currentUser._id);
        userToUnfollow.notifications.splice(notification_index, 1);
        mainUser.save()
            .then(() => {
                var userIndex2 = followers.indexOf(currentUser._id);
                followers.splice(userIndex2, 1);
                userToUnfollow.save()
                    .then(() => {
                        res.redirect(`/profile/${currentUser._id}`);
                    })
            })
    }
})

app.post('/profile/unfollow/:userId', async (req, res) => {
    console.log('req accepted')
    const currentUser = req.user;
    if (!currentUser) {
        res.end('invaild request')
    } else {
        var mainUser = await User.findById(currentUser._id);
        var userToUnfollow = await User.findById(req.params.userId);
        var following = mainUser.following;
        var followers = userToUnfollow.followers;

        var userIndex = following.indexOf(req.params.userId);
        following.splice(userIndex, 1);

        var notification_index = userToUnfollow.notifications.includes(currentUser._id);
        userToUnfollow.notifications.splice(notification_index, 1);
        mainUser.save()
            .then(() => {
                var userIndex2 = followers.indexOf(currentUser._id);
                followers.splice(userIndex2, 1);
                userToUnfollow.save()
                    .then(() => {
                        res.redirect(`/profile/${req.params.userId}`);
                    })
            })
    }
})

// search for posts
app.post('/search/posts', async (req, res) => {
    var search_post = req.body.search_post;
    var currentUser = req.user;
    var posts = await Post.find({ 'content': new RegExp(search_post, 'i'), 'category': req.body.category }).sort({ 'createdAt': -1 }).populate({ path: 'author' });
    console.log(posts);
    console.log(search_post.length);
    if (currentUser) {
        if (req.body.category === 'pigeon' || req.body.category === 'bird' || req.body.category === 'hen') {
            if (search_post.length >= 1) {
                res.render('search_post', {
                    pageTitle: 'Search : ' + search_post,
                    posts,
                    search_post,
                    currentUser,
                    post_search: true
                })
            } else {
                res.render('search_post', {
                    pageTitle: 'Search : ' + search_post,
                    posts: [],
                    search_post,
                    currentUser,
                    post_search: true
                })
            }
        } else {
            var users = await User.find({ 'username': new RegExp(search_post, 'i') })
            if (search_post.length >= 1) {
                res.render('search_post', {
                    pageTitle: 'Search : ' + search_post,
                    users,
                    search_post,
                    currentUser,
                    people_search: true
                })
            } else {
                res.render('search_post', {
                    pageTitle: 'Search : ' + search_post,
                    users: [],
                    search_post,
                    currentUser,
                    people_search: true
                })
            }
        }
    } else {
        if (req.body.category === 'pigeon' || req.body.category === 'bird' || req.body.category === 'hen') {
            if (posts === []) {
                res.render('search_post', {
                    pageTitle: 'Search : ' + search_post,
                    posts: [],
                    search_post,
                    currentUser,
                    post_search: true
                })
            } else {
                if (search_post.length >= 1) {
                    res.render('search_post', {
                        pageTitle: 'Search : ' + search_post,
                        posts,
                        search_post,
                        post_search: true
                    })
                } else {
                    res.render('search_post', {
                        pageTitle: 'Search : ' + search_post,
                        posts: [],
                        search_post,
                        currentUser,
                        post_search: true
                    })
                }
            }
        } else {
            var users = await User.find({ 'username': new RegExp(search_post, 'i') })
            if (search_post.length >= 1) {
                res.render('search_post', {
                    pageTitle: 'Search : ' + search_post,
                    users,
                    search_post,
                    currentUser,
                    people_search: true
                })
            } else {
                res.render('search_post', {
                    pageTitle: 'Search : ' + search_post,
                    users: [],
                    search_post,
                    currentUser,
                    people_search: true
                })
            }
        }
    }

})

app.get('*', (req, res) => {
    res.render('404', {
        pageTitle: "404 Not Found"
    })
})

app.listen(PORT, () => console.log('server is running on port %s', PORT));