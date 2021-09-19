const Post = require('../models/Post')

exports.viewCreateScreen = function (req, res){
    res.render("create-post")

}

exports.create = function(req,res){
    let post = new Post(req.body, req.session.user._id )
    post.create().then(function (newId){ 
        req.flash("success", "New Post successfully created.")
        req.session.save(()=> res.redirect(`/post/${newId}`))
    }).catch(function (errors) {
        errors.forEach(error => req.flash("errors", erros))
        req.session.save(()=> res.redirect("/create-post"))
    })
}

exports.viewSingle = async function (req, res) {
    try{
        let post = await Post.findSingleById(req.params.id, req.visitorId)
        res.render("single-post-screen", {post : post, title:post.title})
    }catch{
        res.render("404")
    }   
}

exports.viewEditScreen = async function (req, res) {
    try {
        let post = await Post.findSingleById(req.params.id, req.visitorId)
        if (post.isVisitorOwner) {
            res.render("edit-post", {post : post})
        }else{
            req.flash("errors", "you do not have permission to perform that action ")
            req.session.save( () => res.redirect("/"))
        }
    }catch{
        res.render('404')
    }
}

exports.edit = function (req, res) {
    let post = new Post(req.body, req.visitorId, req.params.id)
    post.update().then(function (status) {
        //the post is successfully updated in the database
        // or user did have permission, but there were validation errors
        if (status == "success"){
            //post was updated in the database
            req.flash("success", "Post successfully updated.")
            req.session.save(function () {
                res.redirect(`/post/${req.params.id}/edit`)
            })
        }else{
            post.errors.forEach(function(error){
                req.flash("errors", error)
            })
            req.session.save(function () {
                res.redirect(`/post/${req.params.id}/edit`)
            })
        }
    }).catch(function (){
        // a post with the requested id doesn't exist
        // or if current visitor is not the owner of the requested post
        req.flash("errors", "you do not have permission to perform that action.")
        req.session.save(function () {
            res.redirect("/")
        })
    })
}

exports.delete = function(req, res){
    Post.delete(req.params.id, req.visitorId).then(function (){
        req.flash("success", "post successfully deleted.")
        req.session.save( () => res.redirect(`/profile/${req.session.user.username}`))
    }).catch(function (){
        req.flash("errors", "you dont have this permission to perform that action.")
        req.session.save( () => res.redirect("/"))
    })
}

exports.search = function (req, res){
    Post.search(req.body.searchTerm).then( posts =>{
        res.json(posts)
    }).catch(() =>{
        res.json(["error"])
    })
}

exports.apiCreate = function(req,res){
    let post = new Post(req.body, req.apiUser._id )
    post.create().then(function (newId){ 
        res.json("very good")
    }).catch(function (errors) {
        res.json(erros)
    })
}

exports.apiDelete = function(req, res){
    Post.delete(req.params.id, req.apiUser._id).then(function (){
        res.json("sccess")
    }).catch(function (){
        res.json("sorry, you don't have permission to perform that action")
    })
}