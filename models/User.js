const bcrypt = require("bcryptjs")
const validator = require("validator")
const usersCollection = require("../db").db().collection("users")
const md5 = require("md5")

let User = function (data, getAvatar) {
    this.data = data
    this.errors = []
    if (getAvatar == undefined ){getAvatar = false}
    if(getAvatar){this.getAvatar()}
}

User.prototype.cleanUp = function () {
    if (typeof(this.data.username) != "string") {this.data.username = ""}
    if (typeof(this.data.email) != "string") {this.data.email = ""}
    if (typeof(this.data.password) != "string") {this.data.password = ""}

    // get rid of aby bogus properties
    this.data = {
        username : this.data.username.trim().toLowerCase(),
        email : this.data.email.trim().toLowerCase(),
        password : this.data.password
    }
}

User.prototype.login = function () {
    return new Promise( (resolve, reject) => {
        this.cleanUp()
        usersCollection.findOne({username: this.data.username}).then( (attemptedUser) => {
            if (attemptedUser && bcrypt.compareSync(this.data.password, attemptedUser.password)) {
                this.data = attemptedUser
                this.getAvatar()
                resolve("congrats!!!")
            }else{
                reject("invalid username and password")
            }
        }).catch( () => {
            reject("please try again later")
        })
    })
}

User.prototype.validate =  function (){
    return new Promise(async (resolve , reject) => {
        if (this.data.username == ""){this.errors.push("You Must provide a username")}
        if (this.data.username != "" && !validator.isAlphanumeric(this.data.username)) {this.errors.push("only letters and numbers is valid")}
        if (!validator.isEmail(this.data.email)){this.errors.push("You Must provide a valid email")}
        if (this.data.password == ""){this.errors.push("You Must provide a password")}
        if (this.data.password.length > 0 && this.data.password.length < 12) {this.errors.push("password Must be atleast 12 caracters")}
        if (this.data.password.length > 50 ) {this.errors.push("password cannot axceed 50 characters")}
        if (this.data.username.length > 0 && this.data.password.length < 3) {this.errors.push("username Must be atleast 3 caracters")}
        if (this.data.username.length > 30 ) {this.errors.push("username cannot axceed 30 characters")}
    
        // only if usename is valid then check to see if it is already taken
        if (this.data.username.length > 2 && this.data.username.length < 31 && validator.isAlphanumeric(this.data.username)) {
            let usernameExists = await usersCollection.findOne({username : this.data.username})  /// findOne returns a promis and we can use ((await)) with it and we should but ((async)) to function
            if (usernameExists){ this.errors.push("that username is already taken")}
        }
        // only if email is valid then check to see if it is already taken
        if (validator.isEmail(this.data.email)) {
            let emailExists = await usersCollection.findOne({email : this.data.email})  /// findOne returns a promis and we can use ((await)) with it 
            if (emailExists){ this.errors.push("that email is already taken")}
        }
        resolve()
    })
}

User.prototype.register =  async function () {
    return new Promise (async (resolve , reject) => {
        // step #1: validate user data
        this.cleanUp()
        await this.validate()
     
        // step #2: only if there are no validation errors then save the user data into database
        if (!this.errors.length) {
    
            // hash user password
            let salt = bcrypt.genSaltSync(10)
            this.data.password = bcrypt.hashSync(this.data.password, salt)
            await usersCollection.insertOne(this.data)
            this.getAvatar()
            resolve()
        }else {
            reject(this.errors)
        }
    })
}

User.prototype.getAvatar = function () {
    this.avatar = `https://s.gravatar.com/avatar/${md5(this.data.email)}?s=80`
}

User.findByUsername = function (username) {
    return new Promise (function (resolve, reject){
        if(typeof(username) != "string" ) {
            reject()
            return
        }
        usersCollection.findOne({username : username}).then(function (userDoc){
            if(userDoc){
                userDoc = new User(userDoc, true)
                userDoc = {
                    _id: userDoc.data._id,
                    username: userDoc.data.username,
                    avatar: userDoc.avatar
                }
                resolve(userDoc)
            }else{
                reject()
            }
        }).catch(function (){
            reject()
        })
    })
}

User.doseEmailExist = function(email){
    return new Promise (async function(resolve, reject){
        if(typeof(email) != "string"){
            resolve(false)
            return
        }

        let user = await usersCollection.findOne({email: email})
        if(user){
            resolve(true)
        }else{
            resolve(false)
        }
    })
}


module.exports = User