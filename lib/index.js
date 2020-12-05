const TimeCapsule = require('./TimeCapsule')

module.exports = {
  create: TimeCapsule.create,
  createOpened: () => create({ open: new Date(Date.now()).getFullYear() }),
}
