const { DateTime } = require('luxon')
const helper = require('../testHelper').instance()

const { assert, withStubs } = helper

const unit = require('../../utils/dates')

describe('dateUtils', () => {
  before(() => {
    helper.setup()
  })

  after(helper.tearDown)

  describe('#convert12HoursTo24Hours()', () => {
    const cases = [
      { hour: 12, period: 'am', result: 0 },
      { hour: 12, period: 'pm', result: 12 },
      { hour: 1, period: 'am', result: 1 },
      { hour: 1, period: 'pm', result: 13 },
    ]
    for (let i = 2; i <= 11; i++) {
      cases.push({ hour: i, period: 'am', result: i })
      cases.push({ hour: i, period: 'pm', result: i + 12 })
    }

    cases.forEach((testCase) => {
      it(`should return ${testCase.result} when the provided hour is ${testCase.hour} ${testCase.period}`, () => {
        assert.deepEqual(
          unit.convert12HoursTo24Hours(testCase.hour, testCase.period),
          testCase.result,
        )
      })
    })
  })

  describe(`#toLuxonDateTime()`, () => {
    it(
      'should create a luxon DateTime instance from luxon config object',
      withStubs(() => {
        const fromObjectSpy = helper.spy(DateTime, 'fromObject')

        const result = unit.toLuxonDateTime({
          year: 1993,
          month: 5,
          day: 26,
          hour: 4,
          minute: 31,
          zone: 'America/New_York',
        })

        assert.isTrue(fromObjectSpy.calledOnce)
        assert.equal(result.toISO(), '1993-05-26T04:31:00.000-04:00')
      }),
    )

    /**
     * Fails locally depending on time zone
     */
    it(
      'should create a luxon DateTime instance from JS Date object',
      withStubs(() => {
        const fromMillisSpy = helper.spy(DateTime, 'fromMillis')

        const result = unit.toLuxonDateTime(new Date('May 26 1993'))

        assert.isTrue(fromMillisSpy.calledOnce)
        assert.equal(result.toISO(), '1993-05-26T00:00:00.000+00:00')
      }),
    )

    /**
     * Fails locally depending on time zone
     */
    it(
      'should create a luxon DateTime instance from milliseconds Number',
      withStubs(() => {
        const fromMillisSpy = helper.spy(DateTime, 'fromMillis')

        const result = unit.toLuxonDateTime(1585680308918)

        assert.isTrue(fromMillisSpy.calledOnce)
        assert.equal(result.toISO(), '2020-03-31T18:45:08.918-00:00')
      }),
    )

    /**
     * Fails locally depending on time zone
     */
    it(
      'should create a luxon DateTime instance from string',
      withStubs(() => {
        const fromMillisSpy = helper.spy(DateTime, 'fromMillis')

        const result = unit.toLuxonDateTime('Tue Mar 31 2020 14:45:08')
        assert.equal(result.toISO(), '2020-03-31T14:45:08.000+00:00')

        assert.isTrue(fromMillisSpy.calledOnce)
      }),
    )
  })

  /**
   * Fails locally depending on time zone
   */
  describe(`#toLuxonDateTimeConfig()`, () => {
    it(
      'should return luxon date time config from valid luxon DateTime',
      withStubs(() => {
        const fromDate = unit.toLuxonDateTime({
          year: 1993,
          month: 5,
          day: 26,
          hour: 8,
          minute: 31,
          zone: 'America/New_York',
        })

        const toLuxonDateTimeSpy = helper.spy(unit, 'toLuxonDateTime')
        const result = unit.toLuxonDateTimeConfig(fromDate)

        assert.isTrue(toLuxonDateTimeSpy.calledOnce)
        assert.deepEqual(result, {
          year: 1993,
          month: 5,
          day: 26,
          hour: 8,
          minute: 31,
          millisecond: 0,
          second: 0,
          zone: 'America/New_York',
        })
      }),
    )

    it(
      'should return luxon date time config from Date',
      withStubs(() => {
        const toLuxonDateTimeSpy = helper.spy(unit, 'toLuxonDateTime')

        // 06/15/20 in Philly, PA
        const fromDate = new Date('1993-05-26T04:31:02.054-04:00')

        const result = unit.toLuxonDateTimeConfig(fromDate)

        assert.isTrue(toLuxonDateTimeSpy.calledOnce)
        assert.deepEqual(result, {
          year: 1993,
          month: 5,
          day: 26,
          hour: 8,
          minute: 31,
          millisecond: 54,
          second: 2,
        })
      }),
    )

    it(
      'should return luxon date time config from milliseconds',
      withStubs(() => {
        const toLuxonDateTimeSpy = helper.spy(unit, 'toLuxonDateTime')

        // 06/15/20 at 4:31am in Philly, PA
        const result = unit.toLuxonDateTimeConfig(738405062054)

        assert.isTrue(toLuxonDateTimeSpy.calledOnce)
        assert.deepEqual(result, {
          year: 1993,
          month: 5,
          day: 26,
          hour: 8,
          minute: 31,
          millisecond: 54,
          second: 2,
        })
      }),
    )
  })
})
