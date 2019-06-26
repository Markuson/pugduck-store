const express = require('express')
const {checkLogin } = require('../middlewares')
const bodyParser = require('body-parser')
const logic = require('../logic')


const router = express.Router()

const urlencodedParser = bodyParser.urlencoded({ extended: false })

router.get('/', checkLogin('/home'), (req, res) => {
    res.render('landing')
})

router.get('/register', checkLogin('/home'), (req, res) => {
    res.render('register')
})

router.post('/register', [checkLogin('/home'), urlencodedParser], (req, res) => {
    const { body: { name, surname, email, password }, logic } = req

    try {
        logic.registerUser(name, surname, email, password)
            .then(() => res.render('login'))
            .catch(({ message }) => res.render('register', { name, surname, email, message }))
    } catch ({ message }) {
        res.render('register', { name, surname, email, message })
    }
})

router.get('/login', checkLogin('/home'), (req, res) =>
    res.render('login')
)

router.post('/login', [checkLogin('/home'), urlencodedParser], (req, res) => {
    const { body: { email, password }, logic, session } = req

    try {
        logic.loginUser(email, password)
            .then(() => {
                session.token = logic.__userToken__

                res.redirect('/home')
            })
            .catch(({ message }) => res.render('login', { email, message }))
    } catch ({ message }) {
        res.render('login', { email, message })
    }
})

router.get('/home', checkLogin('/', false), (req, res) => {
    const { logic, session } = req
    logic.retrieveUser()
        .then(({ name, favList }) => {
            session.favList = favList
            return logic.searchDucks('')
                .then(ducks => {
                    ducks = ducks.map(({ id, title, imageUrl: image, price }) => {
                        isFav = session.favList.some(fav => fav == id)
                        return { url: `/home/duck/${id}`, title, image, price, isFav, id }
                    })
                    return res.render('home', { name, ducks })
                })
        })
        .catch(({ message }) => res.render('home', {message}))
})

router.get('/home/search', checkLogin('/', false), urlencodedParser, (req, res) => {
    const { query: { query }, logic, session } = req

    session.query = query

    logic.searchDucks(query)
        .then(ducks => {
            ducks = ducks.map(({ id, title, imageUrl: image, price }) =>{
                isFav = session.favList.some(fav => fav == id)
                return { url: `/home/duck/${id}`, title, image, price, isFav, id}
            })

            return logic.retrieveUser()
                .then(({ name }) => res.render('home',{ name, query, ducks }))
        })
        .catch(({ message }) => res.render('home', { message}))
})

router.get('/home/favorites', checkLogin('/', false), urlencodedParser, (req, res) => {
    const { query: { query }, logic, session } = req

    session.query = query

    logic.retrieveFavDucks()
        .then(response => {
            let favs
            favs = response.map(({ id, title, imageUrl: image, price }) =>{
                return { url: `/home/duck/${id}`, title, image, price, id}
            })

            return logic.retrieveUser()
                .then(({ name }) => res.render('home',{ name, query, favs }))
        })
        .catch(({ message }) => res.render('home', { message}))
})

router.get('/home/duck/:id', checkLogin('/', false), (req, res) => {
    const { params: { id }, logic, session: { query } } = req

    logic.retrieveDuck(id)
        .then(({ title, imageUrl: image, description, price }) => {
            const duck = { title, image, description, price }

            return logic.retrieveUser()
                .then(({ name }) => res.render('home', { query, name, duck }))
        })
})

router.post('/logout', (req, res) => {
    req.session.destroy()

    res.redirect('/')
})

router.post('/home/search', checkLogin('/', false), urlencodedParser, (req, res) => {
    const{query:{query}, logic, session, body} = req
    session.query = query;

  if (body.toggleFav) {
    const id = body.toggleFav;
    return logic.toggleFavDuck(id).then(() => res.redirect(`/home/search?query=${query}`));
  } else res.redirect(req.url);
})

router.use(function (req, res, next) {
    res.redirect('/')
})

module.exports = router