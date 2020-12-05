# TimeCapsule.js

Time box your features using a simple interface resembling a natural time capsule.

```javascript
const timeCapsule = TimeCapsule.create({
  open: { year: 2021, month: 1, day: 1 },
  close: { year: 2021, month: 1, day: 2 },
  zone: 'America/New_York',
})

if (timeCapsule.canOpen) {
  // The current time is after the open date 
  // and before the close date of the time capsule.
  // Do whatever you need to do.

  console.log(timeCapsule.getValue(), '🎉 💃')
} else if (timeCapsule.isTooEarly) {
  // The current time is before the open date of the time capsule.

  console.log(`You can't redeem that New Year promotion, yet ⏳`)
} else if (timeCapsule.isTooLate) {
  // The current time is after the close date of the time capsule.

  console.log(`That New Year promo has expired 😥`)
}
```

## Motivations

Many features may have to do with adding a feature at a future date and then removing it at a farther date. Your only current option may be to wait until that date comes, stop what you're doing, and get that time-sensitive (and many times temporary) feature out. Then when a farther date comes, you have to stop what we're doing and remove that feature via another deploy. This is especially bad on the weekends or your vacation time.

Time capsules gives you a better option. Build and deploy all those time-sensitive features now and let them turn themselves on and off in the future when their time come and pass.

It works just as you would expect a natural [time capsule](https://en.wikipedia.org/wiki/Time_capsule) to: put something in it, set a time it can be opened, and (optionally) provide a time that it should be destroyed (closed), never to be opened again, after it is opened.

## Interface

The only requirement is an explicit `open` date configuration object; at least a `year` is required in this configuration. A `close` date configuration can also be provided; this must be a date that exclusively follows `open`.

Additionally, you can set the time zone for the time capsule so, regardless of where a user is, the time capsule's open and close dates are always in relation to your desired time zone. A good example is if you want a feature to only be enabled during the business hours of your headquarters, say Philadelphia; in such case, you can set the time zone to `America/New_York`.

### Date configuration expectations

We use [Luxon](https://moment.github.io/luxon/), "A powerful, modern, and friendly wrapper for Javascript dates and times", under the hood for immutable time manipulation, so our configuration objects, `open` and `close`, require a form that can be converted to a [`Luxon.DateTime`](https://moment.github.io/luxon/docs/class/src/datetime.js~DateTime.html).

So long as your `open` and `close` datetime configurations are valid for [`Luxon.DateTime.fromObject({...})`](https://moment.github.io/luxon/docs/class/src/datetime.js~DateTime.html#static-method-fromObject) or [`new Date(...)`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/Date), they can be used for creating a time capsule.

## How to Use

### Create a time capsule

```javascript
import TimeCapsule from '../lib/timeCapsule'

const TimeZone = {
  losAngeles: 'America/Los_Angeles',
  newYork: 'America/New_York',
}

// Current time is 6/20/2020 at 12:30pm

const timeCapsule = createTimeCapsule({
  // 06/24/2020 at 9:30am
  open: {
    year: 2020,
    month: 6,
    day: 24,
    hour: 9,
    minute: 30,
  },
  // optional: defaults to client's local time zone
  zone: TimeZone.newYork,
  // The end of the day: 11:45pm
  // "close" is optional. It's set to the end of time if not provided
  close: {
    year: 2020,
    month: 6,
    day: 24,
    hour: 23,
    minute: 45,
  },
  // "value" is also optional
  value: 'Some cool stuff from the past',
})
```

### Create an openable time capsule (convenience)

As a convenience for those times when you just want to quickly create a time capsule that can be opened now so that you can quickly query it with `#queryAccess()` (discussed below), you can simply call to `#createOpenable()`:

```javascript
import TimeCapsule from '../lib/timeCapsule'
const timeCapsule = TimeCapsule.createOpenable()
console.log(timeCapsule.canOpen)
// Will always print true
```

This simply createa s time capsule with the minimal config of `open` with the `year` field being one year before the current year. If the current day was June 20, 2020, that would look like the following:

```javascript
const timeCapsule = TimeCapsule.create({ open: { year: 2020 } })
console.log(timeCapsule.canOpen)
// Will always print true
```

### `.canOpen`

Once you have a time capsule, you can check if you can open it using `#canOpen`

```javascript
const myFeatureIsEnabled = timeCapsule.canOpen
```

### `.queryAccess(query)`

For more complex time needs, You can check if you can open a time capsule based on a [timetable](https://www.merriam-webster.com/dictionary/timetable) query using `#queryAccess()`.

#### The idea behind the name of `#queryAccess()`

The idea here is that **a capsule can become open at one point in time**, but only **accessible at certain times**.

Think of this in the context of a business. A company becomes registered and open for business on a single, specific day in time, but patrons can only access it on certain days and at certain times based on its timetable (schedule).

#### How `#queryAccess()` works

`timeCapsule.queryAccess({...})` returns `true` iff the capsule is open (`timeCapsule.canOpen === true`) and the client's current time meets the provided timetable (query).

If the time capsule has a specified timezone, the client's current time will be converted to that timezone before the query is executed against it.

# Example usages

```javascript
import TimeCapsule from '../lib/timeCapsule'

// Current time is Monday 12:30pm

// returns FALSE   for Breakfast
TimeCapsule.createOpenable().queryAccess({
  time: { $thru: ['7am', '11:29am'] },
  weekday: { $thru: ['mon', 'friday'] },
})

// returns FALSE   for Brunch
TimeCapsule.createOpenable().queryAccess({
  time: { $thru: ['10am', '3:29pm'] },
  weekday: ['saturday', 'sun'],
})

// returns TRUE   for Lunch
TimeCapsule.createOpenable().queryAccess({
  time: { $thru: ['11:30am', '3:29pm'] },
  weekday: { $thru: ['monday', 'fri'] },
})
```

## Example usage

```javascript
import TimeCapsule from '../lib/timeCapsule'

const createTimeCapsule = TimeCapsule.create

const TimeZone = {
  losAngeles: 'America/Los_Angeles',
  newYork: 'America/New_York',
}

const capsule = createTimeCapsule({
  // 06/24/2020 at 9:30am
  open: {
    year: 2020,
    month: 6,
    day: 24,
    hour: 9,
    minute: 30,
  },
  zone: TimeZone.newYork, // EDT (optional: defaults to client's local time zone)
  // The end of the day: 11:45pm
  // "close" is optional. It's set to the end of time if not provided
  close: {
    year: 2020,
    month: 6,
    day: 24,
    hour: 23,
    minute: 45,
  },
  // "value" is also optional
  value: 'Some cool stuff from the past',
})

if (capsule.canOpen) {
  // The current time is after the open date of the capsule and before the close date
  // and before the close date of the time capsule.
  // Do whatever you need to do.
  console.log(capsule.getValue(), '🎉 💃')
} else {
  // The time capsule isn't ready to be opened yet
  // or the open period has passed, and it closed forever.

  console.log(`The stars are not in alignment 🌑`)
}
```

### Additional example:

```javascript
if (capsule.canOpen) {
  // The current time is after the open date of the capsule.
  // Do whatever you need to do.

  console.log(capsule.getValue(), '🎉 💃')
} else if (capsule.isTooEarly) {
  // The current time is before the open date of the capsule.

  console.log(`You can't redeem that promotion, yet ⏳`)
} else if (capsule.isTooLate) {
  // The current time is after the close date of the capsule.

  console.log(`That promo has expired 😥`)
}
```

See the tests for the full range of capabilities.
