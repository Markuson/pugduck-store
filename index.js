require('dotenv').config()

const express = require('express')
const package = require('./package.json')
const routes = require('./routes')
const cors = require('cors')
const { injectLogic } = require('./middlewares')
const session = require('express-session')
const MongoStore = require('connect-mongo')(session)
const mongoose = require('mongoose')


const { env: { PORT, MONGO_URL: url },argv: [, , port = PORT || 8080] } = process;

(async () => {

    await mongoose.connect(url, { useNewUrlParser: true, useFindAndModify: false })

    const app = express()

    app.set('view engine', 'pug')
    app.set('views', 'components')

    app.use(session({
        secret: 'my super secret phrase to encrypt my session',
        store: new MongoStore({ mongooseConnection: mongoose.connection })
    }))

    app.use(cors())

    app.use(express.static('public'), injectLogic)

    app.use('/', routes)

    app.use(function (req, res, next) {
        res.status(404).json({ error: 'Not found.' })
    })

    app.listen(port, () => console.log(`${package.name} ${package.version} up on port ${port}`))
})()