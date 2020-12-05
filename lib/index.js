const TimeCapsule = require('./TimeCapsule')

const create = TimeCapsule.create
module.exports = {
  create,
  createOpened() {
    return this.create({ open: { year: new Date(Date.now()).getFullYear() - 1 } })
  },
}
