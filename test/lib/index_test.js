const helper = require('../testHelper').instance()
const TimeCapsule = require('../../lib/TimeCapsule')
const unit = require('../../lib/index')

const { assert, expectFail } = helper

describe('timeCapsule', function () {
  this.timeout(10000)

  const TimeZone = Object.freeze({
    losAngeles: 'America/Los_Angeles',
    newYork: 'America/New_York',
  })

  before(() => helper.setup())

  after(helper.tearDown)

  describe('#default', () => {
    it('ensures default export has valid #create() function', () => {
      assert.isFunction(unit.create)
    })

    it('ensures default export has valid #createOpened() function', () => {
      assert.isFunction(unit.createOpened)
    })
  })

  describe(`#create()`, () => {
    it('should create a time capsule when config.open is luxon.DateTime config object with a valid timezone', () => {
      const config = {
        open: {
          year: 2021,
          month: 7,
          day: 17,
          hour: 4,
          minute: 31,
        },
        zone: TimeZone.newYork,
        value:
          'Note to future self: Building this on June 16th, 2020 was a lot of fun.You are seeing this a a year and a day after it was created.',
      }
      const timeCapsule = unit.create(config)

      assert(timeCapsule instanceof TimeCapsule)

      assert.isTrue(timeCapsule._period.isLuxonInterval)
      assert.equal(timeCapsule._period.s.toISO(), '2021-07-17T04:31:00.000-04:00')
      // This capsule remains open until extremely far in the future once it is opened.
      assert.equal(
        timeCapsule._period.e.toISO(),
        '+12021-07-17T04:31:00.000-04:00', // 10,000 years in the future
      )

      assert(timeCapsule.canOpen !== undefined)
      assert.isNotNull(timeCapsule.canOpen)

      assert(timeCapsule._value)
      assert.equal(timeCapsule._value, config.value)
      assert.isFunction(timeCapsule.getValue)
    })

    /**
     * Note: This test will fail locally due to relative timezone
     */
    it('should create a time capsule when config.open is luxon.DateTime config object without timezone', () => {
      const config = {
        open: {
          year: 2021,
          month: 7,
          day: 17,
          hour: 4,
          minute: 31,
        },
        value:
          'Note to future self: Building this on June 16th, 2020 was a lot of fun.You are seeing this a a year and a day after it was created.',
      }
      const timeCapsule = unit.create(config)

      assert(timeCapsule instanceof TimeCapsule)

      assert.isTrue(timeCapsule._period.isLuxonInterval)
      assert.equal(timeCapsule._period.s.toISO(), '2021-07-17T04:31:00.000-00:00')
      // This capsule remains open until extremely far in the future once it is opened.
      assert.equal(
        timeCapsule._period.e.toISO(),
        '+12021-07-17T04:31:00.000-00:00', // 10,000 years in the future
      )

      assert(timeCapsule.canOpen !== undefined)
      assert.isNotNull(timeCapsule.canOpen)

      assert.equal(timeCapsule._value, config.value)
      assert.isFunction(timeCapsule.getValue)
    })

    it('should default to 10,000 years in the future with the same local time zone as the open date when close date is not provided', () => {
      const capsule = unit.create({ open: { year: 2150 } })
      assert.equal(capsule._period.end.year, 12150)

      // Ensure local zone was set on the default close date
      assert.equal(capsule._period.end.zone.name, 'UTC')
      assert.equal(capsule._period.end.zone.name, capsule._period.start.zone.name)
    })

    it('should default to 10,000 years in the future with the same provided time zone as the open date when close date is not provided', () => {
      const capsule = unit.create({ open: { year: 2150 }, zone: TimeZone.newYork })
      assert.equal(capsule._period.end.year, 12150)

      // Ensure the provided zone was set on the default close date
      assert.equal(capsule._period.end.zone.name, 'America/New_York')
      assert.equal(capsule._period.end.zone.name, capsule._period.start.zone.name)
    })

    it('should throw an error when open date is not provided', () => {
      expectFail(
        () => {
          unit.create({ close: { year: 2150 } })
        },
        (err) => {
          assert.equal(err.message, 'Must provide an open date.')
        },
      )
    })

    it('should throw an error when the close date is before the open date', () => {
      expectFail(
        () => {
          unit.create({ open: { year: 2150 }, close: { year: 2149 } })
        },
        (err) => {
          assert.equal(
            err.message,
            'Invalid open and close dates. Close date must be greater than or equal to the open date.',
          )
        },
      )
    })
  })
})
