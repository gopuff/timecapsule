const luxon = require('luxon')

const isObject = (v) => {
  return typeof v === 'object' && v !== null
}

/**
 * Converts any valid Date argument to a Luxon DateTime instance.
 * @param {String|Number|Date|Object} v
 * @returns luxin.DateTime
 */
const toLuxonDateTime = (v) => {
  if (isObject(v) && !v.getTime) {
    if (v.isLuxonDateTime) {
      return v
    }
    return luxon.DateTime.fromObject(v)
  }
  return luxon.DateTime.fromMillis(new Date(v).getTime())
}

/**
 * Converts any valid Date argument to a Luxon DateTime instance.
 * @param {String|Number|Date|Object} v
 * @returns luxin.DateTime
 */
const toLuxonDateTimeConfig = (v) => {
  const date = toLuxonDateTime(v)
  const config = date.c
  console.log(v, date, config)

  if (date.zone) {
    config.zone = date.zone.zoneName
  }
  if (!config.zone) {
    delete config.zone
  }
  return config
}

const convert12HoursTo24Hours = (hour, period) => {
  if (period == 'pm' && hour < 12) return hour + 12
  else if (period !== 'pm' && hour == 12) return hour - 12

  return hour
}

module.exports = {
  toLuxonDateTime,
  toLuxonDateTimeConfig,
  convert12HoursTo24Hours,
}
