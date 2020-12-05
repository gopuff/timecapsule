const luxon = require('luxon')

const isObject = (v) => {
  return typeof v === 'object' && v !== null
}

const unit = {}

/**
 * Converts any valid Date argument to a Luxon DateTime instance.
 * @param {String|Number|Date|Object} v
 * @returns luxin.DateTime
 */
unit.toLuxonDateTime = (v) => {
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
unit.toLuxonDateTimeConfig = (v) => {
  const date = unit.toLuxonDateTime(v)
  const config = date.c

  if (date.zone) {
    config.zone = date.zone.zoneName
  }
  if (!config.zone) {
    delete config.zone
  }
  return config
}

unit.convert12HoursTo24Hours = (hour, period) => {
  if (period == 'pm' && hour < 12) return hour + 12
  else if (period !== 'pm' && hour == 12) return hour - 12

  return hour
}

module.exports = unit
