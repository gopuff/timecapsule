const helper = require('../testHelper').instance()
const TimeCapsule = require('../../lib/TimeCapsule')
const unit = require('../../lib/index')

const { assert, withStubs, patchNow } = helper

describe('timeCapsule', function () {
  this.timeout(10000)

  const TimeZone = Object.freeze({
    losAngeles: 'America/Los_Angeles',
    newYork: 'America/New_York',
  })

  before(() => helper.setup())

  after(helper.tearDown)

  describe('#create', () => {
    it('ensures default export has valid #create() function', () => {
      assert.isFunction(unit.create)
      assert.equal(unit.create, TimeCapsule.create)
    })
  })

  describe('#createOpened()', () => {
    it(
      'ensures default export has valid #createOpened() function',
      withStubs(() => {
        // Tue Jul 21 2020 17:01:04 GMT-0400 (Eastern Daylight Time)
        const now = 1595462400000
        patchNow(now)

        const createSpy = helper.stub(unit, 'create')

        // Run the proxy function
        unit.createOpened()

        assert.isTrue(createSpy.calledOnce)
        assert.deepEqual(createSpy.lastCall.args, [{ open: {year: 2019} }])
      }),
    )
  })
})
