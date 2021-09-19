const mongodb = require('mongodb')
const dotenv = require('dotenv')
dotenv.config()

mongodb.MongoClient.connect(process.env.CONNECTIONSTRING, { useNewUrlParser: true, useUnifiedTopology: true }, (error, client) => {
    module.exports = client
    const app = require('./app')
    app.listen(process.env.PORT)
})