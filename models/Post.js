const postsCollection = require("../db").db().collection("posts")
const followsCollection = require("../db").db().collection("follows")
const ObjectId = require("mongodb").ObjectId
const User = require("./User")
const sanitizeHTML = require("sanitize-html")

let Post = function(data, userid, requestedPostId){
    this.data = data
    this.errors = []
    this.userid = userid
    this.requestedPostId = requestedPostId

}

Post.prototype.cleanUp = function(){
    if (typeof(this.data.title) != "string") {this.data.title = ""}
    if (typeof(this.data.body) != "string") {this.data.body = ""}

    
    // get rid of any bogus properties
    this.data = {
        title: sanitizeHTML(this.data.title.trim(), {allowedTags: [], allowedAttributes : {}}),
        body: sanitizeHTML(this.data.body.trim(), {allowedTags: [], allowedAttributes : {}}),
        createdDate: new Date(),
        author: ObjectId(this.userid)
    }

}

Post.prototype.validate = function(){
    if (this.data.title == "") {this.errors.push("you must provide a title")}
    if (this.data.body == "") {this.errors.push("you must provide post contant")}

}

Post.prototype.create = function(){
    return new Promise((resolve, reject) =>{
        this.cleanUp()
        this.validate()
        if (!this.errors.length){
            //save post into database  
            postsCollection.insertOne(this.data).then((info) =>{
                resolve(info.insertedId)
            }).catch(() =>{
                this.errors.push("pleas try again later.")
                reject(this.errors)
            })
        }else{
            reject(this.errors)
        }
    })

}

Post.prototype.update = function() {
    return new Promise(async (resolve, reject) => {
        try {
            let post =  await Post.findSingleById(this.requestedPostId, this.userid)
            if (post.isVisitorOwner) {
                // actually updte the db
                let status = await this.actuallyUpdate()
                resolve(status)
            }else{
                reject()
            }
        }catch{
            reject()
        }   
    })
}

Post.prototype.actuallyUpdate = function(){
    return new Promise(async (resolve, reject) =>{
        this.cleanUp()
        this.validate()
        if(!this.errors.length){
            await postsCollection.findOneAndUpdate({_id: new ObjectId(this.requestedPostId)}, {$set : {title : this.data.title, body: this.data.body}})
            resolve("success")
        }else{
            resolve("failure")
        }
    })
}

Post.findSingleById = function (id, visitorId) {
    return new Promise (async function (resolve, reject){
        if (typeof(id) != "string" || !ObjectId.isValid(id)) {
            reject()
            return
        }
        let posts = await postsCollection.aggregate([
            {$match : {_id: new ObjectId(id)}},                    /// match used to look for specific argument
            {$lookup : {from : "users", localField: "author", foreignField: "_id", as: "authorDocument"}},   // look up used for get another document from another table
            {$project: {                                      // project used for Choose what do we want to show 
                title: 1,
                body: 1,
                createdDate: 1,
                authorId: "$author",
                author: {$arrayElemAt: ["$authorDocument", 0]}  // in this line we told it that the author become an object contain the data of user
            }}                                                  // instead of beeing an objectID
        ]).toArray()

        //clean up author property in each post object
        posts = posts.map(function (post) {
            post.isVisitorOwner = post.authorId.equals(visitorId)
            post.author = {
                username : post.author.username,
                avatar: new User(post.author, true).avatar
            }
            return post
        })
        if (posts.length) {
            resolve(posts[0])
        }else{
            reject()
        }
    })
}

Post.findByAuthorId = function(authorid) {
    return new Promise (async function (resolve, reject){
        let posts = await postsCollection.aggregate([
            {$match : {author: authorid}},                    /// match used to look for specific argument
            {$lookup : {from : "users", localField: "author", foreignField: "_id", as: "authorDocument"}},   // look up used for get another document from another table
            {$project: {                                      // project used for Choose what do we want to show 
                title: 1,
                body: 1,
                createdDate: 1,
                author: {$arrayElemAt: ["$authorDocument", 0]}  // in this line we told it that the author become an object contain the data of user
            }},
            {$sort: {createdDate : -1}}                                               // instead of beeing an objectID
        ]).toArray()

        posts = posts.map(function (post) {
            post.author = {
                username : post.author.username,
                avatar: new User(post.author, true).avatar
            }
            return post
        })
        resolve(posts)
    })
    
}

Post.delete = function(postIdToDelete, currentUserId){
    return new Promise (async (resolve, reject) => {
        try{
            let post = await Post.findSingleById(postIdToDelete, currentUserId)
            if (post.isVisitorOwner){
                await postsCollection.deleteOne({_id: new ObjectId(postIdToDelete)})
                resolve()
            }else{
                reject()
            }
        }
        catch{
            reject()
        }
    })
}

Post.func = function(searchTerm){
    return new Promise (async function (resolve, reject){
        let posts = await postsCollection.aggregate([
            {$match: {$text : {$search: searchTerm}}},                    /// match used to look for specific argument
            {$lookup : {from : "users", localField: "author", foreignField: "_id", as: "authorDocument"}},   // look up used for get another document from another table
            {$project: {                                      // project used for Choose what do we want to show 
                title: 1,
                body: 1,
                createdDate: 1,
                authorId: "$author",
                author: {$arrayElemAt: ["$authorDocument", 0]}  // in this line we told it that the author become an object contain the data of user
            }},
            {$sort: {score: {$meta: "textScore"}}}
        ]).toArray()
    
        posts = posts.map(function (post) {
            // post.isVisitorOwner = post.authorId.equals(visitorId)

            post.authorId = undefined
            post.author = {
                username : post.author.username,
                avatar: new User(post.author, true).avatar
            }
            return post
        })
        resolve(posts)
    })
}

Post.reusablePostQuery = function (extendedTerms){
    
    return new Promise(async (resolve, reject) =>{
    let aggOperations = extendedTerms.concat([
        {$lookup : {from : "users", localField: "author", foreignField: "_id", as: "authorDocument"}},   
        {$project: {                                       
            title: 1,
            body: 1,
            createdDate: 1,
            authorId: "$author",
            author: {$arrayElemAt: ["$authorDocument", 0]}  // in this line we told it that the author become an object contain the data of user
        }}
    ])
        let posts = await postsCollection.aggregate(aggOperations).toArray()

        posts = posts.map(function (post) {
            // post.isVisitorOwner = post.authorId.equals(visitorId)

            post.authorId = undefined
            post.author = {
                username : post.author.username,
                avatar: new User(post.author, true).avatar
            }
            return post 
        })
        resolve(posts)
    })
}

Post.search = function(searchTerm){
    return new Promise( async (resolve, reject) =>{
        if(typeof(searchTerm) == "string"){
            let posts = await Post.func(searchTerm)
            resolve(posts)
        }else{
            reject()
        }
    })
}

Post.countPostByAuthor = function(id){
    return new Promise(async (resolve, reject) =>{
        let postCount =  await postsCollection.countDocuments({author: id})
        resolve(postCount)
    })
}

Post.getFeed = async function(id){
    // create an array of the user ids that the current user follows
    let followedUsers = await followsCollection.find({
        authorId: new ObjectId(id)
    }).toArray()


    followedUsers = followedUsers.map(function(followDoc){
        return followDoc.followedId
    })

    // look for posts where the author is in the above array of followed users
    return Post.reusablePostQuery([
        {$match: {author: {$in : followedUsers}}},
        {$sort: {createdDate: -1}}
    ])


    
}

module.exports = Post


