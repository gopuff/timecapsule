const luxon = require('luxon')
const {
  toLuxonDateTime,
  toLuxonDateTimeConfig,
  convert12HoursTo24Hours,
} = require('../utils/dates')

const { Interval } = luxon

const is = {
  Object(objToCheck) {
    return !!objToCheck && Object.prototype.toString.call(objToCheck) === '[object Object]'
  },
  Array(objToCheck) {
    return !!objToCheck && Object.prototype.toString.call(objToCheck) === '[object Array]'
  },
  String(obj) {
    return toString.call(obj) == '[object String]'
  },
}

const WEEKDAY_NUMBER_MAP = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
}
// Support 3-character abbreviations of the days
Object.entries(WEEKDAY_NUMBER_MAP).forEach(([key, value]) => {
  WEEKDAY_NUMBER_MAP[key.substring(0, 3)] = value
})

// -- Type Definitions

/**
 * A time table that specifies specific times a capsule
 * can be accessed once it is opened.
 * @typedef {(Object)} TimeTable
 * @property {?(TimeQuery)} time
 * @property {?(WeekdayQuery)} weekday
 */

/**
 * A query against the current time.
 * @typedef {(MilitaryTime|MeridiemTime|ThruQuery)} TimeQuery
 * @property {?(Number)} hour
 * @property {?(Number)} minute
 */

/**
 * A query against the current weekday.
 * @typedef {(String|String[]|ThruQuery)} WeeekdayQuery
 */

/**
 * A query of whether the current moment falls between two time points
 * with the two points being inclusive.
 *
 * When querying weekdays, note that Sunday is the first day of the week.
 *
 * @typedef {(Object)} ThruQuery
 * @property {(WeekdayQuery[]|TimeQuery[])} $thru
 * @property {any} $thru.0 The start (inclusive)
 * @property {any} $thru.1 The end (inclusive)
 */

/**
 * Time using the 24-hour clock.
 * @typedef {(Object)} MilitaryTime
 * @property {?(Number)} hour A number from 0 through 23.
 * @property {?(Number)} minute A minute from 0 through 60.
 */

/**
 * Time using the 12-hour clock time with "AM" and "PM"
 * -- "ante meridiem" [before 12pm (midday)] and "post meridiem" (after 12pm).
 *
 * The format for this kind of time is "hour:minute(am|pm)"
 * wherein "hour" is a number from 1 through 12,
 * and "minute" is a number from 0 through 60.
 * @typedef {(String)} MeridiemTime
 */

// -- Type Definitions

/**
 * @private
 */
class TimeCapsule {
  /**
   * Create a time capsule with an interval and an optional value.
   * @param {luxon.Interval} interval
   * @param {?any} value
   */
  constructor(config) {
    const { open, close, zone, value } = config
    this._openConfig = open
    this._closeConfig = close
    this._zone = zone

    this._startDate = toLuxonDateTime(open)
    this._endDate = toLuxonDateTime(close)

    this._period = Interval.fromDateTimes(this._startDate, this._endDate)

    if (!this._period.isValid) {
      throw new Error(
        'Invalid open and close dates. Close date must be greater than or equal to the open date.',
      )
    }

    this._value = value
  }

  /**
   * Check if the current time is between this time capsule's open and close datetimes.
   */
  get canOpen() {
    return this._period.contains(this._getCurrentDateTime())
  }

  /**
   * Check if the current time is before this time capsule's open datetime.
   */
  get isTooEarly() {
    return this._period.start.diff(this._getCurrentDateTime()).milliseconds > 0
  }

  /**
   * Check if the current time is after this time capsule's close datetime.
   */
  get isTooLate() {
    return this._period.end.diff(this._getCurrentDateTime()).milliseconds < 0
  }

  /**
   * Query whether this time capsule can be accessed based on the provided time table.
   * @param {TimeTable} timeTable
   * @returns {boolean} true if the the time capsule is opened
   * and the current time meets the time table's specifications.
   */
  queryAccess(timeTable) {
    if (!this.canOpen) {
      return false
    }

    let currentDate = this._getCurrentDateTime()
    currentDate = currentDate.setZone(this._period.start.zone)

    const params = Object.keys(timeTable)
    const supportedParams = ['time', 'weekday']

    return params.every((queryKey) => {
      if (!supportedParams.includes(queryKey)) {
        throw new Error(`Unsupported query param: ${queryKey}`)
      }

      const keyIsWeekday = queryKey === 'weekday'
      const keyIsTime = queryKey === 'time'
      let queryValue = timeTable[queryKey]
      const currentWeekday = this._normalizeWeekday(currentDate.weekday)

      if (keyIsTime) {
        queryValue = this._normalizeTimeQuery(queryValue)
      }

      return this._runTimeTableQuery({
        keyIsTime,
        keyIsWeekday,
        queryValue,
        currentDate,
        currentWeekday,
      })
    })
  }

  /**
   * Attempt to get the value in the time capsule.
   * @returns {*} the value provided during creation of the time capsule ifs it can be opened.
   */
  getValue() {
    if (!this.canOpen) {
      return
    }

    return this._value
  }

  _runThroughQuery({ keyIsTime, keyIsWeekday, queryValue, currentDate, currentWeekday }) {
    let [start, end] = queryValue.$thru

    if (keyIsWeekday) {
      start = this._normalizeWeekday(start)
      end = this._normalizeWeekday(end)

      return currentWeekday >= start && currentWeekday <= end
    }

    if (keyIsTime) {
      const startDate = toLuxonDateTime({ ...toLuxonDateTimeConfig(currentDate), ...start })
      const endConfig = { ...toLuxonDateTimeConfig(currentDate), ...end }
      const endDate = toLuxonDateTime(endConfig)
        // Luxon's Interval is inclusive of the start but exclusive of the end.
        // We need our through query to be inclusive of the end.
        .plus({ seconds: 1 })

      return luxon.Interval.fromDateTimes(startDate, endDate).contains(currentDate)
    }
  }

  _runArrayQuery({ keyIsTime, keyIsWeekday, queryValue, currentDate, currentWeekday }) {
    let queryValues

    if (keyIsWeekday) {
      queryValues = queryValue.map(this._normalizeWeekday)
      return queryValues.includes(currentWeekday)
    }

    if (keyIsTime) {
      // TODO(lincoln) true if query is only hour and it matches current hour,
      // true if query is hour:minute and it matches current hour:minute,
      // up to end time or duration (or only support absolute times)
      throw new Error('Array matching against time is not yet supported.')
    }
  }

  _runExactMatchQuery({ keyIsTime, keyIsWeekday, queryValue, currentDate, currentWeekday }) {
    const supportedQueryTimeParts = TimeCapsule.supportedQueryTimeParts

    if (keyIsWeekday) {
      return currentWeekday === this._normalizeWeekday(queryValue)
    }

    if (keyIsTime) {
      if (!queryValue) {
        return false
      }

      const queryTimeParts = Object.keys(queryValue).filter((part) => {
        return supportedQueryTimeParts.includes(part)
      })

      if (!queryTimeParts.length) {
        return false
      }

      return queryTimeParts.every((timeKey) => {
        return currentDate[timeKey] === queryValue[timeKey]
      })
    }

    return false
  }

  _runTimeTableQuery({ keyIsTime, keyIsWeekday, queryValue, currentDate, currentWeekday }) {
    // Normalize params
    if (is.Object(queryValue) && queryValue.$through) {
      queryValue.$thru = queryValue.$through
    }

    // Through match
    if (is.Object(queryValue) && queryValue.$thru) {
      return this._runThroughQuery({
        keyIsTime,
        keyIsWeekday,
        queryValue,
        currentDate,
        currentWeekday,
      })
    }

    // Array match
    if (is.Array(queryValue)) {
      return this._runArrayQuery({
        keyIsTime,
        keyIsWeekday,
        queryValue,
        currentDate,
        currentWeekday,
      })
    }

    // -- Exact match
    return this._runExactMatchQuery({
      keyIsTime,
      keyIsWeekday,
      queryValue,
      currentDate,
      currentWeekday,
    })
  }

  _normalizeWeekday(weekday) {
    if (is.String(weekday)) {
      return WEEKDAY_NUMBER_MAP[weekday.toLowerCase()]
    }

    if (weekday === 7) {
      // We need to ensure that the value for sunday is always 0.
      // JS Date API considers it 0.
      // It appears that the Luxon date considers sunday to be 7.
      // We will stick with 0 for JS Date.
      return 0
    }

    return weekday
  }

  _normalizeTimeQuery(queryValue) {
    if (queryValue === undefined) {
      return queryValue
    }

    if (is.Array(queryValue)) {
      // Recurse
      queryValue = queryValue.map((v) => {
        return this._normalizeTimeQuery(v)
      })
    }

    if (is.Object(queryValue) && queryValue.$thru) {
      // Recurse
      queryValue.$thru = queryValue.$thru.map((v) => {
        return this._normalizeTimeQuery(v)
      })
    }

    if (is.String(queryValue)) {
      queryValue = queryValue.toLowerCase()
      const [hour, minute] = queryValue.split(':')
      queryValue = { hour, minute }
    }

    let found12HourClockPeriod = undefined
    if (is.String(queryValue.hour)) {
      let hour = queryValue.hour.toLowerCase()

      if (hour.endsWith('am') || hour.endsWith('pm')) {
        found12HourClockPeriod = hour.endsWith('am') ? 'am' : 'pm'
        hour = hour.replace('am', '').replace('pm', '').trim()
      }
      queryValue.hour = parseInt(hour)
    }

    if (is.String(queryValue.minute)) {
      let minute = queryValue.minute.toLowerCase()

      if (minute.endsWith('am') || minute.endsWith('pm')) {
        found12HourClockPeriod = minute.endsWith('am') ? 'am' : 'pm'
        minute = minute.replace('am', '').replace('pm', '').trim()
      }

      queryValue.minute = parseInt(minute)
    }

    if (found12HourClockPeriod) {
      queryValue.hour = convert12HoursTo24Hours(queryValue.hour, found12HourClockPeriod)
    }

    if (is.Object(queryValue)) {
      if (queryValue.hour === undefined) {
        delete queryValue.hour
      }

      if (queryValue.minute === undefined) {
        delete queryValue.minute
      }
      Object.entries(queryValue).reduce((map, [key, value]) => {
        if (value !== undefined && TimeCapsule.supportedQueryTimeParts.includes(key)) {
          map[key] = value
        }

        return map
      }, {})
    }

    return queryValue
  }

  _getCurrentDateTime() {
    return toLuxonDateTime(Date.now())
  }
}

TimeCapsule.supportedQueryTimeParts = ['minute', 'hour']

module.exports = TimeCapsule
