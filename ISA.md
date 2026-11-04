## Problem

Dayta's public scheduling links leave its domain. The existing site is static, and a browser cannot safely hold the Google Calendar refresh token.

## Vision

A visitor can choose a time at `daytanalytics.com/book/` and receive a real calendar invitation. The page looks like Dayta and works on a phone.

## Out of Scope

- Payments, team round robin, date polls, packages, and subscriptions are outside the first release.
- Existing TidyCal bookings remain available through their original links. New scheduling uses the Dayta booking page after its verified public-form check.

## Constraints

- The Google Calendar refresh token stays outside Git and browser assets.
- The existing Dayta site is served by GitHub Pages.
- No scheduling SaaS subscription is introduced.
- The first exposed booking type is Meeting With Landon. Other existing TidyCal types await Landon's scope decision.
- Meeting With Landon uses weekdays 9 AM to 3 PM America/Chicago, 15-minute starts, 30-minute duration, two-hour notice, and a 60-day horizon.

## Goal

Build a Dayta-branded booking page backed by Landon's Google Calendar. Release it only after availability, invite creation, conflict handling, and token isolation are verified.

## Criteria

- [x] ISC-1: `/book/` presents the selected booking type's title and duration.
- [x] ISC-2: `/book/` presents Google Calendar free slots in the visitor's time zone.
- [x] ISC-3: Busy Google Calendar intervals do not appear as bookable slots.
- [x] ISC-4: A stale or conflicting slot is rejected at submission.
- [x] ISC-5: A valid submission creates one event on Landon's calendar.
- [x] ISC-6: A valid submission includes the invitee's email as an attendee.
- [x] ISC-7: Retrying a successful submission does not create a second event.
- [x] ISC-8: No token or OAuth client secret appears in tracked files or browser responses.
- [x] ISC-9: The page remains usable at 390px wide.
- [x] ISC-10: Anti: the public API does not expose calendar event details.
- [x] ISC-11: Anti: the public API does not accept an unlisted booking type.
- [x] ISC-12: The live booking flow passes an end-to-end check before old links change.
- [x] ISC-13: The page uses the homepage's Fraunces, IBM Plex Sans, IBM Plex Mono, palette and exact Dayta wordmark settings.
- [x] ISC-14: A month calendar and explicit time-zone selector make all available dates within the current 60-day horizon browsable.
- [x] ISC-15: Date selection, details, errors and confirmation fit 320px and 390px phone layouts without horizontal overflow.
- [x] ISC-16: Invalid input and upstream errors return controlled responses; conflicts preserve entered contact details and offer another time.

## Accepted requirements, November 4, 2026

Landon requested full live testing and a professional, easy-to-use UI matching the rest of his website, including the same fonts and logo. He explicitly chose `https://daytanalytics.com/book/` as his default scheduling link instead of TidyCal. Use a controlled booking to Landon's own email for the live check, inspect the calendar invitation and Meet link, then remove the test event. Public-form CAPTCHA confirmation remains required at action time.

## Test Strategy

- ISC-1, ISC-2, ISC-9: render the local page at desktop and mobile widths.
- ISC-3, ISC-4, ISC-7, ISC-10, ISC-11: run server tests with a fake calendar provider.
- ISC-5, ISC-6, ISC-12: make one controlled live booking and inspect the resulting event, then remove the test event.
- ISC-8: inspect tracked files and public API output for secret material.

## Features

- Booking API: calendar availability, policy, validation, idempotent event creation. Satisfies ISC-3 through ISC-8 and ISC-10 through ISC-12.
- Booking page: Dayta visual system, time zone display, type picker, form and confirmation. Satisfies ISC-1, ISC-2 and ISC-9.
- Release: secret storage, hosted API, live smoke check and site link update. Satisfies ISC-8 and ISC-12.

## Evidence and release state, 2026-09-26

- Nine API tests pass. They cover daylight saving time, availability conflicts, idempotency, concurrent submissions, origin checks, the release gate, and private event details.
- The live Cloud Run API reads Landon's primary calendar and returns available slots. The GitHub Pages page renders on desktop and at 390px wide. The reCAPTCHA checkbox renders on the live domain.
- A controlled booking using the real calendar token created an event at the selected instant with the invitee and a Google Meet link. The test event was deleted.
- The public page is live at `https://daytanalytics.com/book/`. Existing TidyCal links have not been changed. ISC-12 awaits one verified booking through the public form.

## Evidence and release state, November 4, 2026

The public form successfully booked one controlled meeting at 09:00–09:30 America/Chicago on November 5, 2026. Event `db89b8a10b9329ff7ed3409de05845c7e92f593ab` appeared on Landon's primary calendar with the intended attendee and a Google Meet link. Gmail message `1a1a7c561052b2cc` was delivered to Landon's own test plus alias with the matching date, time, Meet URL and calendar attachment. The booked and overlapping starts disappeared from public availability. The event was then removed; calendar search returned zero QA events and both starts returned to availability.

Live testing uncovered an obsolete 2048-character CAPTCHA response limit. A freshly solved response measured 2382 characters. The corrected bounded limit allows Google verification while retaining expected-hostname checks. Regressions also cover awaited booking errors, busy intervals, daylight saving time, duplicate and simultaneous submissions. All 13 local API tests pass. Cloud Run revision `dayta-booking-api-00005-cev` serves the correction with the same runtime identity, secrets, instance limit and concurrency. No key rotation or access change was needed.

Browser checks cover widths 320, 390, 768, 1024 and 1440, phone form and compact CAPTCHA, month navigation, Eastern/Tokyo time-zone conversion, validation, error states, preserved contact details after conflicts, and confirmation. They used Chrome, including viewport emulation; Safari and physical-device behavior were not tested. Fonts and logo settings match the existing homepage. New website booking links now point to `/book/`, and Landon's saved default is `https://daytanalytics.com/book/`. Self-service cancellation/rescheduling and other meeting types remain outside this release.
