const TimeCapsule = require('./TimeCapsule')
const { toLuxonDateTime, toLuxonDateTimeConfig } = require('../utils/dates')


/**
 * Create a time capsule.
 * @param {{
    open: Object,
    close: ?Object,
    zone: ?String,
    value: ?any,
 * }} config
 */
const create = (config) => {
    const { open, close, zone } = config

    if (!open) {
        throw new Error('Must provide an open date.')
    }

    const openConfig = toLuxonDateTimeConfig(open)
    const closeConfig = toLuxonDateTimeConfig(
        close ||
        // Default to a close date ten-thousand years in the future.
        // That should be far enough.
        toLuxonDateTime(open).plus({ years: 10000 })
    )

    // Prevent providing of zone on open and close
    // to prevent them from being different.
    delete openConfig.zone
    delete closeConfig.zone

    // Set the provided zone on both open and close dates
    if (zone) {
        openConfig.zone = zone
        closeConfig.zone = zone
    }

    return new TimeCapsule({ ...config, open: openConfig, close: closeConfig })
}

module.exports = {
    create,
    createOpened: () => create({ open: new Date(Date.now()).getFullYear() })
}

