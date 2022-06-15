app.get('/profile/:id', async (req, res) => {
    currentUser = req.user;
    var posts = [];
    var user = await User.findById({ '_id': currentUser._id });
    for (let i = 0; i < user.posts.length; i++) {
        var post = await Post.findById({ '_id': user.posts[i] }).lean().sort({ 'createdAt': -1 }).populate('author')
        posts.push(post);
    }

    console.log(user.posts.length);
    console.log(user.posts)
    res.render('auth_profile', {
        pageTitle: req.user.username,
        user,
        currentUser,
        posts
    })
})