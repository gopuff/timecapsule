# TimeCapsule.js
Time box your features using a simple interface resembling a natural time capsule.

## Motivations
Many of our support tickets have to do with adding a feature at a future date and then removing it at a farther date. Our only current option is to wait until that date comes, stop what we're doing, and get that temporary feature out. Then when a farther date comes, we have to stop what we're doing and remove that feature via another deploy. This is especially bad on the weekends.

Time capsules give us a better option. Build and deploy all those temporary features now and let them turn themselves on and off in the future when their time come and pass.

It works just as you would expect a natural time capsule to: put something in it, set a time it can be opened, and (optionally) provide a time that it should be destroyed, never to be opened again, after it is opened. 

## Interface
The only requirement is an explicit `open` date (time is optional). Additionally, you can set the time zone for the time capsule so, regardless of where a user is, the time capsule's open and close dates are always in relation to your desired time zone; a good example is if you want a feature to only be enabled during the business hours of goPuff's HQ office in Philadelphia, you can set the time zone to `America/New_York`.

### Example usage
```
import { create as createTimeCapsule, TimeZone } from '../lib/timeCapsule'

const capsule = createTimeCapsule({
	// 06/24/2020 at 9:30am
	open: {
		year: 2020,
		month: 6,
		day: 24,
		hour: 9,
		minute: 30,
	},
	zone: TimeZone.goPuffHq, // EDT (optional: defaults to client's local time zone)
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

## Additional example:
```
if (capsule.canOpen) {
	// The current time is after the open date of the capsule.
	// Do whatever you need to do.

	console.log(capsule.getValue(), '🎉 💃')
} else if (capsule.isTooEarly) {
	// The current time is before the open date of the capsule.

        console.log(`You can't redeem that promotion, yet ⏳`)
}  else if (capsule.isTooLate) {
	// The current time is after the close date of the capsule.

        console.log(`That promo has expired 😥`)
}
```

See the tests for the full range of capabilities.
