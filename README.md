# TimeCapsule.js

Time box your features using a simple interface resembling a natural time capsule.

## Motivations

Many features may have to do with adding a feature at a future date and then removing it at a farther date. Your only current option may be to wait until that date comes, stop what you're doing, and get that time-sensitive (and many times temporary) feature out. Then when a farther date comes, you have to stop what we're doing and remove that feature via another deploy. This is especially bad on the weekends or your vacation time.

Time capsules gives you a better option. Build and deploy all those time-sensitive features now and let them turn themselves on and off in the future when their time come and pass.

It works just as you would expect a natural [time capsule](https://en.wikipedia.org/wiki/Time_capsule) to: put something in it, set a time it can be opened, and (optionally) provide a time that it should be destroyed (closed), never to be opened again, after it is opened.

## Interface

The only requirement is an explicit `open` date configuration object; at least a `year` is required in this configuration.

Additionally, you can set the time zone for the time capsule so, regardless of where a user is, the time capsule's open and close dates are always in relation to your desired time zone. A good example is if you want a feature to only be enabled during the business hours of your headquarters, say Philadelphia; in such case, you can set the time zone to `America/New_York`.

## How to Use

### Create a time capsule

```javascript
import TimeCapsule from '../lib/timeCapsule'

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
  // EDT (optional: defaults to client's local time zone)
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
TimeCapsule.createOpen().queryAccess({
  time: { $thru: ['7am', '11:29am'] },
  weekday: { $thru: ['mon', 'friday'] },
})

// returns FALSE   for Brunch
TimeCapsule.createOpen().queryAccess({
  time: { $thru: ['10am', '3:29pm'] },
  weekday: ['saturday', 'sun'],
})

// returns TRUE   for Lunch
TimeCapsule.createOpen().queryAccess({
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
