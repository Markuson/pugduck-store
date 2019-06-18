const normalize = require('../common/normalize')
const validate = require('../common/validate')
const userApi = require('../data/user-api')
const duckApi = require('../data/duck-api')
const { LogicError } = require('../common/errors')
const token = require('../common/token')

class Logic {
    constructor(token) {
        this.__userToken__ = token
    }

    get __userId__() {
        if (this.__userToken__) {
            const payload = token.payload(this.__userToken__)

            return payload.id
        }
    }

    get isUserLoggedIn() {
        return !!this.__userToken__
    }

    registerUser(name, surname, email, password) {
        validate.arguments([
            { name: 'name', value: name, type: 'string', notEmpty: true },
            { name: 'surname', value: surname, type: 'string', notEmpty: true },
            { name: 'email', value: email, type: 'string', notEmpty: true },
            { name: 'password', value: password, type: 'string', notEmpty: true }
        ])

        validate.email(email)
        const favList = []

        return userApi.create(email, password, { name, surname, favList})
            .then(response => {
                if (response.status === 'OK') return

                throw new LogicError(response.error)
            })
    }

    loginUser(email, password) {
        validate.arguments([
            { name: 'email', value: email, type: 'string', notEmpty: true },
            { name: 'password', value: password, type: 'string', notEmpty: true }
        ])

        validate.email(email)

        return userApi.authenticate(email, password)
            .then(response => {
                if (response.status === 'OK') {
                    const { data: { token } } = response

                    this.__userToken__ = token
                } else throw new LogicError(response.error)
            })
    }

    retrieveUser() {
        return userApi.retrieve(this.__userId__, this.__userToken__)
            .then(response => {
                if (response.status === 'OK') {
                    const { data: { name, surname, username: email, favList } } = response

                    return { name, surname, email, favList }
                } else throw new LogicError(response.error)
            })
    }

    logoutUser() {
        // this.__userId__ = null
        // this.__userToken__ = null

        // OR fully remove all key values from session storage
        sessionStorage.clear()
    }


    searchDucks(query) {
        validate.arguments([
            { name: 'query', value: query, type: 'string' }
        ])

        return duckApi.searchDucks(query)
            .then(ducks => ducks instanceof Array ? ducks : [])
    }

    retrieveDuck(id) {
        validate.arguments([
            { name: 'id', value: id, type: 'string' }
        ])

        return duckApi.retrieveDuck(id)
    }

    toggleFavDuck(id) {
        validate.arguments([
            { name: 'id', value: id, type: 'string' }
        ])

        return userApi.retrieve(this.__userId__, this.__userToken__)
            .then(response => {
                const { status, data } = response

                if (status === 'OK') {
                    const { favList = [] } = data // NOTE if data.favs === undefined then favs = []

                    const index = favList.indexOf(id)

                    if (index < 0) favList.push(id)
                    else favList.splice(index, 1)

                    return userApi.update(this.__userId__, this.__userToken__, { favList })
                        .then(() => { })
                }

                throw new LogicError(response.error)
            })
    }

    retrieveFavDucks() {
        return userApi.retrieve(this.__userId__, this.__userToken__)
            .then(response => {
                const { status, data } = response

                if (status === 'OK') {
                    const { favList = [] } = data
                    if (favList.length) {
                        const calls = favList.map(fav => duckApi.retrieveDuck(fav))

                        return Promise.all(calls)
                    } else return favList
                }

                throw new LogicError(response.error)
            })
    }
}

module.exports = Logic