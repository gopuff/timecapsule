const helper = require('../testHelper').instance()
const dates = require('../../utils/dates')

const TimeCapsule = require('../../lib/TimeCapsule')
const unit = TimeCapsule
const { assert, withStubs, patchNow, expectFail } = helper

describe('#TimeCapsule', () => {
  const { create: createTimeCapsule } = unit

  const TimeZone = Object.freeze({
    losAngeles: 'America/Los_Angeles',
    newYork: 'America/New_York',
  })

  describe('#supportedQueryTimeParts', () => {
    assert.deepEqual(unit.supportedQueryTimeParts, ['minute', 'hour'])
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

  describe('#canOpen', () => {
    it('should return true when the current local time is between the open and close dates of the capsule which has an explicit close date', () => {
      const config = {
        open: {
          year: 2019,
          month: 7,
          day: 17,
          hour: 4,
          minute: 31,
        },
        zone: TimeZone.newYork,
        close: {
          year: 2020,
          month: 3,
          day: 17,
          hour: 6,
          minute: 30,
        },
        value: 'Some cool stuff from the past',
      }
      const capsule = createTimeCapsule(config)

      // Stub the current time with same timezone as the capsule
      patchNow(
        dates
          .toLuxonDateTime({
            ...config.close,
            // 2 minutes before the capsule closes
            minute: config.close.minute - 2,
            zone: TimeZone.newYork,
          })
          .toMillis(),
      )

      assert.isTrue(capsule.canOpen)
    })

    it('should return true when the current time is between the open and close dates of the capsule that never closes after it is opened', () => {
      const capsule = createTimeCapsule({
        open: {
          // sometime in the past
          year: 2019,
          month: 7,
          day: 17,
        },
        zone: TimeZone.newYork,
        // This capsule doesn't close
        close: undefined,
        value: 'Some cool stuff from the past',
      })

      assert.isTrue(capsule.canOpen)
    })

    it('should return false when the current time is after the open date of the capsule but in an earlier time zone than that of the time capsule.', () => {
      const config = {
        open: {
          year: 2821,
          month: 7,
          day: 17,
          hour: 4,
          minute: 31,
        },
        zone: TimeZone.newYork,
        value: 'Some cool stuff from the past',
      }
      const capsule = createTimeCapsule(config)

      // Stub the current time to a leading time zone
      patchNow(
        dates
          .toLuxonDateTime({
            ...config.open,
            // 2 minutes after the capsule opens.
            // This won't matter because we're in a timezone that's ahead of the timezone of the capsule,
            // so this time will still be too early to open the capsule.
            minute: config.open.minute + 2,
          })
          // Set the time zone to an earlier time zone than the capsule's
          // while keeping the time (hour:minute) the same.
          .setZone('Europe/London', { keepLocalTime: true })
          .toMillis(),
      )

      assert.isFalse(capsule.canOpen)
      // Sanity check:
      assert.isTrue(capsule.isTooEarly)
      assert.isFalse(capsule.isTooLate)
    })

    it('should return false when the current time is before the close date of the capsule but in an trailing time zone to that of the time capsule.', () => {
      const config = {
        open: {
          year: 2821,
          month: 7,
          day: 17,
          hour: 4,
          minute: 31,
        },
        zone: TimeZone.newYork,
        close: {
          year: 2821,
          month: 8,
          day: 17,
          hour: 5,
          minute: 45,
        },
        value: 'Some cool stuff from the past',
      }
      const capsule = createTimeCapsule(config)

      // Stub the current time to a trailing time zone
      patchNow(
        dates
          .toLuxonDateTime({
            ...config.close,
            // 2 minutes before the capsule closes.
            // This won't matter because we're in a timezone that's ahead of the timezone of the capsule,
            // so this time will still be too early to open the capsule.
            minute: config.close.minute - 2,
          })
          // Set the time zone to a trailing time zone to that of the capsule
          // while keeping the time (hour:minute) the same.
          .setZone(TimeZone.losAngeles, { keepLocalTime: true })
          .toMillis(),
      )

      assert.isFalse(capsule.canOpen)
      // Sanity check:
      assert.isTrue(capsule.isTooLate)
      assert.isFalse(capsule.isTooEarly)
    })

    it('should return false when the current local time is before the open date of the capsule in the', () => {
      const config = {
        open: {
          year: 2021,
          month: 7,
          day: 17,
          hour: 4,
          minute: 31,
        },
        zone: TimeZone.newYork,
        value: 'Some cool stuff from the past',
      }
      const capsule = createTimeCapsule(config)

      // Stub the current local time with same time zone as the capsule
      patchNow(
        dates
          .toLuxonDateTime({
            ...config.open,
            // 2 minutes before the capsule opens
            minute: config.open.minute - 2,
            zone: TimeZone.newYork,
          })
          .toMillis(),
      )

      assert.isFalse(capsule.canOpen)
    })
  })

  describe('#isTooEarly', () => {
    it('should return true when the current time is before the open date of the capsule', () => {
      const config = {
        open: {
          year: 2021,
          month: 7,
          day: 17,
          hour: 4,
          minute: 31,
        },
        zone: TimeZone.newYork,
        value: 'Some cool stuff from the past',
      }
      const capsule = createTimeCapsule(config)

      // Stub the current time
      patchNow(
        dates
          .toLuxonDateTime({
            ...config.open,
            // 2 minutes before the capsule opens
            minute: config.open.minute - 2,
          })
          .toMillis(),
      )

      assert.isTrue(capsule.isTooEarly)
    })

    it('should return false when the current time is after the open date of the capsule', () => {
      const config = {
        open: {
          year: 2021,
          month: 7,
          day: 17,
          hour: 4,
          minute: 31,
        },
        zone: TimeZone.newYork,
        value: 'Some cool stuff from the past',
      }
      const capsule = createTimeCapsule(config)

      // Stub the current time
      patchNow(
        dates
          .toLuxonDateTime({
            ...config.open,
            // 3 minutes after the capsule opens
            minute: config.open.minute + 3,
          })
          .setZone(config.zone, { keepLocalTime: true })
          .toMillis(),
      )

      assert.isFalse(capsule.isTooEarly)
    })
  })

  describe('#isTooLate', () => {
    it('should return true when the current time is after the close date of the capsule', () => {
      const config = {
        open: {
          year: 2021,
          month: 7,
          day: 17,
          hour: 4,
          minute: 31,
        },
        zone: TimeZone.newYork,
        close: {
          year: 2022,
          month: 8,
          day: 17,
          hour: 4,
          minute: 15,
        },
        value: 'Some cool stuff from the past',
      }
      const capsule = createTimeCapsule(config)

      // Stub the current time
      patchNow(
        dates
          .toLuxonDateTime({
            ...config.close,
            // 1 minutes after the capsule closes
            minute: config.close.minute + 1,
          })
          .setZone(config.zone, { keepLocalTime: true })
          .toMillis(),
      )

      assert.isTrue(capsule.isTooLate)
    })

    it('should return false when the current time is before the close date of the capsule', () => {
      const config = {
        open: {
          year: 2021,
          month: 7,
          day: 17,
          hour: 4,
          minute: 31,
        },
        zone: TimeZone.newYork,
        close: {
          year: 2022,
          month: 8,
          day: 17,
          hour: 4,
          minute: 15,
        },
        value: 'Some cool stuff from the past',
      }
      const capsule = createTimeCapsule(config)

      // Stub the current time
      patchNow(
        dates
          .toLuxonDateTime({
            ...config.close,
            // 2 minutes before the capsule closes
            minute: config.close.minute - 2,
          })
          .setZone(config.zone, { keepLocalTime: true })
          .toMillis(),
      )

      assert.isFalse(capsule.isTooLate)
    })
  })

  describe('#_normalizeTimeQuery()', () => {
    const getCapsule = () => {
      const config = {
        open: {
          year: 2019,
        },
      }
      return createTimeCapsule(config)
    }

    const cases = [
      { time: '12am', result: { hour: 0 } },
      { time: '12pm', result: { hour: 12 } },
      { time: '12:00am', result: { hour: 0, minute: 0 } },
      { time: '12:00pm', result: { hour: 12, minute: 0 } },
      { time: '12:01am', result: { hour: 0, minute: 1 } },
      { time: '12:01pm', result: { hour: 12, minute: 1 } },
      { time: '1am', result: { hour: 1 } },
      { time: '1pm', result: { hour: 13 } },
      { time: '1:00am', result: { hour: 1, minute: 0 } },
      { time: '1:00pm', result: { hour: 13, minute: 0 } },
      { time: '1:56am', result: { hour: 1, minute: 56 } },
      { time: '1:56pm', result: { hour: 13, minute: 56 } },
      {
        time: { hour: 5, minute: 21 },
        result: { hour: 5, minute: 21 },
      },
      {
        time: ['12:56am', '1:23pm'],
        result: [
          { hour: 0, minute: 56 },
          { hour: 13, minute: 23 },
        ],
      },
      {
        time: [{ hour: 1, minute: 45 }, '1:23pm', { hour: 2 }, { minute: 27 }, '2pm'],
        result: [
          { hour: 1, minute: 45 },
          { hour: 13, minute: 23 },
          { hour: 2 },
          { minute: 27 },
          { hour: 14 },
        ],
      },
    ]

    for (let i = 2; i <= 11; i++) {
      cases.push({ time: `${i}am`, result: { hour: i } })
      cases.push({ time: `${i}pm`, result: { hour: i + 12 } })

      const minute = Math.floor(i * 3)
      cases.push({
        time: `${i}:${minute >= 10 ? minute : `0${minute}`}am`,
        result: { hour: i, minute },
      })
      cases.push({
        time: `${i}:${minute >= 10 ? minute : `0${minute}`}pm`,
        result: { hour: i + 12, minute },
      })
    }

    cases.forEach((testCase) => {
      it(`should return ${JSON.stringify(
        testCase.result,
      )} when the provided time query is ${JSON.stringify(testCase.time)}`, () => {
        assert.deepEqual(
          getCapsule()._normalizeTimeQuery(testCase.time, testCase.result),
          testCase.result,
        )
      })
    })
  })

  describe('#_normalizeWeekday()', () => {
    const getCapsule = () => {
      const config = {
        open: {
          year: 2019,
        },
      }
      return createTimeCapsule(config)
    }

    const days = [
      { day: 'Sunday', number: 0 },
      { day: 'Monday', number: 1 },
      { day: 'Tuesday', number: 2 },
      { day: 'Wednesday', number: 3 },
      { day: 'Thursday', number: 4 },
      { day: 'Friday', number: 5 },
      { day: 'Saturday', number: 6 },
    ]

    days.forEach((testCase) => {
      it(`should return ${testCase.number} when the provided day is ${testCase.day}`, () => {
        assert.equal(getCapsule()._normalizeWeekday(testCase.day), testCase.number)
      })

      it(`should return ${
        testCase.number
      } when the provided day is ${testCase.day.toLowerCase()}`, () => {
        assert.equal(getCapsule()._normalizeWeekday(testCase.day.toLowerCase()), testCase.number)
      })

      it(`should return ${
        testCase.number
      } when the provided day is ${testCase.day.toUpperCase()}`, () => {
        assert.equal(getCapsule()._normalizeWeekday(testCase.day.toUpperCase()), testCase.number)
      })

      it(`should return ${testCase.number} when the provided day is ${testCase.day
        .substring(0, 3)
        .toLowerCase()}`, () => {
        assert.equal(
          getCapsule()._normalizeWeekday(testCase.day.substring(0, 3).toLowerCase()),
          testCase.number,
        )
      })

      it(`should return ${testCase.number} when the provided day is ${testCase.number}`, () => {
        assert.equal(getCapsule()._normalizeWeekday(testCase.number), testCase.number)
      })
    })

    describe('sunday', () => {
      it('should return 0 when provided 0 for sunday', () => {
        assert.equal(getCapsule()._normalizeWeekday(0), 0)
      })

      it('should return 0 when provided 7 for sunday', () => {
        assert.equal(getCapsule()._normalizeWeekday(7), 0)
      })
    })
  })

  describe('#queryAccess()', () => {
    describe('weekday', () => {
      describe('when weekday query is met', () => {
        const testCases = [
          {
            query: 3,
          },
          // Sunday integer test.
          {
            query: 0,
            // Sunday 7/21/19
            currentTimeConfig: { year: 2019, month: 7, day: 21 },
          },
          // Sunday string test
          {
            query: 'sunday',
            // Sunday 7/21/19
            currentTimeConfig: { year: 2019, month: 7, day: 21 },
          },
          {
            query: 'Wednesday',
          },
          {
            query: 'wednesday',
          },
          {
            query: 'Wed',
          },
          {
            query: 'wed',
          },
          {
            query: ['wed'],
          },
          {
            query: ['wednesday'],
          },
          {
            query: ['friday', 'wednesday'],
          },
          {
            query: ['friday', 'wed'],
          },
          // Through weekdays
          { query: { $thru: ['Tuesday', 'thursday'] } },
          // Inclusive through weekdays
          { query: { $thru: ['Wednesday', 'Friday'] } },
          { query: { $thru: ['Monday', 'Wednesday'] } },
        ]

        testCases.forEach((testCase) => {
          const currentTimeDescription = testCase.currentTimeConfig
            ? ` and current time config is ${JSON.stringify(testCase.currentTimeConfig)}`
            : ''

          it(`should return true when the capsule is open and the weekday query ${JSON.stringify(
            testCase.query,
          )} is met${currentTimeDescription}`, () => {
            // Default config: Wednesday 7/17/2019 at 4am
            const config = {
              open: {
                year: 2019,
                month: 7,
                day: 17,
                hour: 4,
                minute: 31,
              },
              zone: TimeZone.newYork,
              value: 'Some cool stuff from the past',
            }
            const capsule = createTimeCapsule(config)

            // Default current time: 4:33am
            patchNow(
              dates
                .toLuxonDateTime({
                  ...config.open,
                  // 2 minutes before the capsule closes
                  minute: config.open.minute + 2,
                  ...(testCase.currentTimeConfig ? testCase.currentTimeConfig : {}),
                  zone: TimeZone.newYork,
                })
                .toMillis(),
            )

            assert.isTrue(capsule.queryAccess({ weekday: testCase.query }))
          })
        })
      })

      describe('when weekday query is not met', () => {
        const testCases = [
          { query: 4 },
          {
            query: 'Thursday',
          },
          {
            query: 'Thursday',
          },
          {
            query: 'Thu',
          },
          {
            query: 'thu',
          },
          {
            query: '',
          },
          {
            query: ['thu'],
          },
          {
            query: ['tuesday', 'thu', 'friday'],
          },
          {
            query: [],
          },
        ]

        testCases.forEach((testCase) => {
          it(`should return false when the capsule is open but the weekday query ${JSON.stringify(
            testCase.query,
          )} is not met`, () => {
            // Default config: Wednesday 7/17/2019 at 4am
            const config = {
              open: {
                year: 2019,
                month: 7,
                day: 17,
                hour: 4,
                minute: 31,
              },
              zone: TimeZone.newYork,
              value: 'Some cool stuff from the past',
            }
            const capsule = createTimeCapsule(config)

            // Default current time: 4:33am
            patchNow(
              dates
                .toLuxonDateTime({
                  ...config.open,
                  // 2 minutes before the capsule closes
                  minute: config.open.minute + 2,
                  zone: TimeZone.newYork,
                })
                .toMillis(),
            )

            assert.isFalse(capsule.queryAccess({ weekday: testCase.query }))
          })
        })
      })
    })

    describe('time', () => {
      describe('when time query is met', () => {
        const testCases = [
          {
            query: { hour: 4 },
          },
          {
            query: '4am',
          },
          {
            query: '12pm',
            openTimeConfig: { hour: 12 },
          },
          {
            query: '2:33pm',
            openTimeConfig: { hour: 14 },
          },
          // 0th hour
          {
            query: { hour: 0 },
            openTimeConfig: { hour: 0 },
          },
          {
            query: { minute: 33 },
          },
          // 0th minute
          {
            query: { minute: 0 },
            openTimeConfig: { minute: 0 },
            currentTimeConfig: { minute: 0 },
          },
          // compound time
          {
            query: { hour: 4, minute: 33 },
          },
          {
            query: '4:33am',
          },
          // Through times
          { query: { $thru: [{ hour: 0 }, { hour: 4, minute: 34 }] } },
          { query: { $thru: [{ hour: 1 }, '5am'] } },
          { query: { $thru: ['1am', '2pm'] } },
          { query: { $thru: ['4:29am', '5:00pm'] } },
          // Through, inclusive of end time
          { query: { $thru: ['1am', '4:33am'] } },
          // Client is in different time zone
          {
            query: { $thru: ['1:29am', '5:00am'] },
            capsuleConfig: {
              zone: TimeZone.losAngeles,
            },
            currentTimeConfig: {
              year: 2020,
              hour: 7,
            },
            currentZone: TimeZone.newYork,
          },
          {
            query: { $thru: ['1:29am', '5:00am'] },
            capsuleConfig: {
              zone: TimeZone.newYork,
            },
            currentTimeConfig: {
              year: 2020,
              hour: 1,
              minute: 59,
            },
            currentZone: TimeZone.losAngeles,
          },
        ]

        testCases.forEach((testCase) => {
          const openTimeDescription = testCase.openTimeConfig
            ? ` and open time config is ${JSON.stringify(testCase.openTimeConfig)}`
            : ''
          const currentTimeDescription = testCase.currentTimeConfig
            ? ` and current time config is ${JSON.stringify(testCase.currentTimeConfig)}`
            : ''
          const currentTimeZoneDescription = testCase.currentZone
            ? ` and the current time zone is ${testCase.currentZone}`
            : ''

          it(`should return true when the capsule is open and the time query ${JSON.stringify(
            testCase.query,
          )} is met${openTimeDescription}${currentTimeDescription}${currentTimeZoneDescription}`, () => {
            // Default config: Wednesday 7/17/2019 at 4:31am
            const config = {
              open: {
                year: 2019,
                month: 7,
                day: 17,
                hour: 4,
                minute: 31,
                ...(testCase.openTimeConfig ? testCase.openTimeConfig : {}),
              },
              zone: TimeZone.newYork,
              value: 'Some cool stuff from the past',
              ...(testCase.capsuleConfig ? testCase.capsuleConfig : {}),
            }
            const capsule = createTimeCapsule(config)

            const currentTimeZone = testCase.currentZone || TimeZone.newYork

            // Default current time: 1:33am
            patchNow(
              dates
                .toLuxonDateTime({
                  ...config.open,
                  // 2 minutes before the capsule closes
                  minute: config.open.minute + 2,
                  ...(testCase.currentTimeConfig ? testCase.currentTimeConfig : {}),
                  zone: currentTimeZone,
                })
                .toMillis(),
            )

            assert.isTrue(capsule.queryAccess({ time: testCase.query }))
          })
        })
      })

      describe('when time query is not met', () => {
        const testCases = [
          {
            query: { hour: 5 },
          },
          {
            query: { minute: 32 },
          },
          { query: '5am' },
          // compound query
          {
            query: { hour: 5, minute: 33 },
          },
          {
            query: { hour: 4, minute: 32 },
          },
          { query: '5:33am' },
          { query: '4:32am' },
          // empty hour string in compound query
          {
            query: { hour: '', minute: 33 },
          },
          // Empty query
          { query: {} },
          { query: undefined },
          // Through times
          { query: { $thru: [{ hour: 0 }, { hour: 3, minute: 33 }] } },
          { query: { $thru: [{ hour: 0 }, { hour: 4, minute: 20 }] } },
          { query: { $thru: [{ hour: 1 }, '4:00am'] } },
          { query: { $thru: ['2pm', '1am'] } },
          { query: { $thru: ['4:34am', '5:00pm'] } },
          // Client is in different time zone
          {
            query: { $thru: ['1:29am', '5:00am'] },
            capsuleConfig: {
              zone: TimeZone.losAngeles,
            },
            currentTimeConfig: {
              year: 2020,
              hour: 8,
            },
            currentZone: TimeZone.newYork,
          },
        ]

        testCases.forEach((testCase) => {
          it(`should return false when the capsule is open and the time query ${JSON.stringify(
            testCase.query,
          )} is not met`, () => {
            // Default config: Wednesday 7/17/2019 at 4am
            const config = {
              open: {
                year: 2019,
                month: 7,
                day: 17,
                hour: 4,
                minute: 31,
              },
              zone: TimeZone.newYork,
              value: 'Some cool stuff from the past',
            }
            const capsule = createTimeCapsule(config)

            const currentTimeZone = testCase.currentZone || TimeZone.newYork

            // Default current time: 1:33am
            patchNow(
              dates
                .toLuxonDateTime({
                  ...config.open,
                  // 2 minutes before the capsule closes
                  minute: config.open.minute + 2,
                  ...(testCase.currentTimeConfig ? testCase.currentTimeConfig : {}),
                  zone: currentTimeZone,
                })
                .toMillis(),
            )

            assert.isFalse(capsule.queryAccess({ time: testCase.query }))
          })
        })
      })
    })

    describe('weekday + time', () => {
      describe('when weekday + time query is met', () => {
        const testCases = [
          {
            timeQuery: { hour: 4 },
            weekdayQuery: 'wed',
          },
          {
            timeQuery: { hour: 4, minute: 33 },
            weekdayQuery: 'wed',
          },
          {
            timeQuery: { hour: 4, minute: 33 },
            weekdayQuery: ['tuesday', 'wed', 'sunday'],
          },
          {
            timeQuery: '4am',
            weekdayQuery: ['tuesday', 'wed', 'sunday'],
          },
          {
            timeQuery: '4:33am',
            weekdayQuery: ['monday', 'wed', 'friday'],
          },
          {
            timeQuery: { minute: 33 },
            weekdayQuery: ['tuesday', 'Wednesday', 'sunday'],
          },
          // Through time, array weekday
          {
            timeQuery: { $thru: ['1am', '4:45am'] },
            weekdayQuery: ['tuesday', 'Wednesday', 'sunday'],
          },
          // Through time, array weekday, sunday test
          {
            timeQuery: { $thru: ['1am', '4:45am'] },
            weekdayQuery: ['sunday', 'saturday'],
            // Sunday 7/21/19
            currentTimeConfig: { year: 2019, month: 7, day: 21 },
          },
          // Through weekday, exact time
          {
            timeQuery: { hour: 4 },
            weekdayQuery: { $thru: ['sunday', 'wednesday'] },
          },
          // Through time, through weekday
          {
            timeQuery: { $thru: ['1am', '4:33am'] },
            weekdayQuery: { $thru: ['sunday', 'wednesday'] },
          },
        ]

        testCases.forEach((testCase) => {
          const openTimeDescription = testCase.openTimeConfig
            ? ` and open time config is ${JSON.stringify(testCase.openTimeConfig)}`
            : ''
          const currentTimeDescription = testCase.currentTimeConfig
            ? ` and current time config is ${JSON.stringify(testCase.currentTimeConfig)}`
            : ''

          it(`should return true when the capsule is open and the weekday + time query ${JSON.stringify(
            { weekday: testCase.weekdayQuery, time: testCase.timeQuery },
          )} is met${openTimeDescription}${currentTimeDescription}`, () => {
            // Default config: Wednesday 7/17/2019 at 4:31am
            const config = {
              open: {
                year: 2019,
                month: 7,
                day: 17,
                hour: 4,
                minute: 31,
                ...(testCase.openTimeConfig ? testCase.openTimeConfig : {}),
              },
              zone: TimeZone.newYork,
              value: 'Some cool stuff from the past',
            }
            const capsule = createTimeCapsule(config)

            // Default current time: Wednesday 4:33am
            patchNow(
              dates
                .toLuxonDateTime({
                  ...config.open,
                  // 2 minutes before the capsule closes
                  minute: config.open.minute + 2,
                  ...(testCase.currentTimeConfig ? testCase.currentTimeConfig : {}),
                  zone: TimeZone.newYork,
                })
                .toMillis(),
            )

            assert.isTrue(
              capsule.queryAccess({ weekday: testCase.weekdayQuery, time: testCase.timeQuery }),
            )
          })
        })
      })

      describe('when weekday + time query is not met', () => {
        const testCases = [
          {
            timeQuery: { hour: 4 },
            weekdayQuery: 'thursday',
          },
          {
            timeQuery: { hour: 4, minute: 33 },
            weekdayQuery: 'thursday',
          },
          {
            timeQuery: { hour: 4, minute: 33 },
            weekdayQuery: ['tuesday', 'friday', 'sunday'],
          },
          {
            timeQuery: '4am',
            weekdayQuery: ['monday', 'thu', 'sunday'],
          },
          {
            timeQuery: '4:33am',
            weekdayQuery: ['monday', 'thu', 'friday'],
          },
          {
            timeQuery: { minute: 33 },
            weekdayQuery: ['tuesday', 'friday', 'sunday'],
          },
          // Through time not met
          {
            timeQuery: { $thru: ['1am', '4:30am'] },
            weekdayQuery: ['tuesday', 'Wednesday', 'sunday'],
          },
          // Through weekday not met
          {
            timeQuery: { $thru: ['1am', '5am'] },
            weekdayQuery: { $thru: ['sunday', 'tuesday'] },
          },
        ]

        testCases.forEach((testCase) => {
          const openTimeDescription = testCase.openTimeConfig
            ? ` and open time config is ${JSON.stringify(testCase.openTimeConfig)}`
            : ''
          const currentTimeDescription = testCase.currentTimeConfig
            ? ` and current time config is ${JSON.stringify(testCase.currentTimeConfig)}`
            : ''

          it(`should return false when the capsule is open and the weekday + time query ${JSON.stringify(
            { weekday: testCase.weekdayQuery, time: testCase.timeQuery },
          )} is not met${openTimeDescription}${currentTimeDescription}`, () => {
            // Default config: Wednesday 7/17/2019 at 4:31am
            const config = {
              open: {
                year: 2019,
                month: 7,
                day: 17,
                hour: 4,
                minute: 31,
                ...(testCase.openTimeConfig ? testCase.openTimeConfig : {}),
              },
              zone: TimeZone.newYork,
              value: 'Some cool stuff from the past',
            }
            const capsule = createTimeCapsule(config)

            // Default current time: Wednesday 4:33am
            patchNow(
              dates
                .toLuxonDateTime({
                  ...config.open,
                  // 2 minutes before the capsule closes
                  minute: config.open.minute + 2,
                  ...(testCase.currentTimeConfig ? testCase.currentTimeConfig : {}),
                  zone: TimeZone.newYork,
                })
                .toMillis(),
            )

            assert.isFalse(
              capsule.queryAccess({ weekday: testCase.weekdayQuery, time: testCase.timeQuery }),
            )
          })
        })
      })
    })
  })

  describe('#getValue()', () => {
    it(
      'should return the value provided during creation when the capsule is open',
      withStubs(() => {
        const config = {
          open: {
            // Some year far in the future
            year: 2700,
            month: 7,
            day: 17,
          },
          zone: TimeZone.newYork,
          value: { text: 'Some cool stuff from the past' },
        }
        const capsule = createTimeCapsule(config)

        // Stub canOpen to true
        helper.replaceGetter(capsule, 'canOpen', () => true)

        assert.isTrue(capsule.getValue() === config.value)
      }),
    )

    it(
      'should not return the value provided during creation when the capsule is not open',
      withStubs(() => {
        const config = {
          open: {
            // Some year far in the past
            year: 2002,
            month: 7,
            day: 17,
          },
          zone: TimeZone.newYork,
          value: { text: 'Some cool stuff from the past' },
        }
        const capsule = createTimeCapsule(config)

        // Stub canOpen to false
        helper.replaceGetter(capsule, 'canOpen', () => false)
        assert.isUndefined(capsule.getValue())
      }),
    )
  })
})
