const express = require('express')
const session = require('express-session')
const MongoStore = require("connect-mongo")
const flash = require("connect-flash")
const csrf = require("csurf")
const markdown = require("marked")
const sanitizeHTML = require("sanitize-html")
const app = express()

app.use(express.urlencoded({extended: false}))
app.use(express.json())
app.use('/api', require('./router-api'))   ///// this line to work with api




/// to handle with sessions
let sessionOptions = session({
    secret: "javaScript is soooo cool",
    store: MongoStore.create({client: require("./db")}),
    resave: false,
    saveUninitialized: false,
    cookie: {maxAge: 1000 * 60 * 60 * 24, httpOnly: true}    ///// one day
})


app.use(sessionOptions)
app.use(flash())

app.use(function (req, res, next){
    // make our markdown function available from within ejs templets

    res.locals.filterUserHtml = function (content) {
        return sanitizeHTML(markdown(content), {allowedTags : ['p', 'br', 'ul', 'h1', 'ol', 'li', 'i', 'h2'], allowedAttributes: {}})
    }


    //make all error and success flash messages avalible from all ejs
    res.locals.errors = req.flash("errors")
    res.locals.success = req.flash("success")

    //make current user id available on the req object
    if (req.session.user) {
        req.visitorId = req.session.user._id
    }else{
        req.visitorId = 0
    }

    //we use this line of code to make the ejs files aware about
    //the session.user data then we dont have to pass this data 
    // every time with the reqest to the ejs files
    res.locals.user = req.session.user     
    next()
})


const router = require("./router.js")

app.use(express.static('public'))  /// to make the app aware of public folder 
app.set("views", "views")
app.set("view engine", 'ejs')  /// to define ejs extention

app.use(csrf())

app.use(function(req,res,next){
    res.locals.csrfToken = req.csrfToken()
    next()
})

app.use('/', router)


app.use(function (err,req,res,next) {
    if(err){
        if(err.code == "EBADCSRFTOKEN"){
            req.flash('errors', "Cross site request forgery detected")
            req.session.save(() => res.redirect('/'))
        }else{
            res.render("404")
        }
    }
})

const server = require('http').createServer(app)
const io = require('socket.io')(server)

io.use(function(socket, next){
    sessionOptions(socket.request, socket.request.res, next)
})

io.on('connection', function(socket){
    if (socket.request.session.user) {
        let user = socket.request.session.user

        socket.emit("welcom" , {username : user.username, avatar: user.avatar})

        socket.on("chatMessageFromBrowser", function(data){
            socket.broadcast.emit("chatMessageFromServer", {message: sanitizeHTML(data.message, {allowedTags:[], allowedAttributes:{}}), username : user.username, avatar: user.avatar})
        })
    }
})

module.exports = server
