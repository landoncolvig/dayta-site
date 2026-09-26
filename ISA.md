## Problem

Dayta's public scheduling links leave its domain. The existing site is static, and a browser cannot safely hold the Google Calendar refresh token.

## Vision

A visitor can choose a time at `daytanalytics.com/book/` and receive a real calendar invitation. The page looks like Dayta and works on a phone.

## Out of Scope

- Payments, team round robin, date polls, packages, and subscriptions are outside the first release.
- Existing TidyCal links remain active until the replacement has passed a live booking check.

## Constraints

- The Google Calendar refresh token stays outside Git and browser assets.
- The existing Dayta site is served by GitHub Pages.
- No scheduling SaaS subscription is introduced.
- The first exposed booking type is Meeting With Landon. Other existing TidyCal types await Landon's scope decision.
- Meeting With Landon uses weekdays 9 AM to 3 PM America/Chicago, 15-minute starts, 30-minute duration, two-hour notice, and a 60-day horizon.

## Goal

Build a Dayta-branded booking page backed by Landon's Google Calendar. Release it only after availability, invite creation, conflict handling, and token isolation are verified.

## Criteria

- [ ] ISC-1: `/book/` presents the selected booking type's title and duration.
- [ ] ISC-2: `/book/` presents Google Calendar free slots in the visitor's time zone.
- [ ] ISC-3: Busy Google Calendar intervals do not appear as bookable slots.
- [ ] ISC-4: A stale or conflicting slot is rejected at submission.
- [ ] ISC-5: A valid submission creates one event on Landon's calendar.
- [ ] ISC-6: A valid submission includes the invitee's email as an attendee.
- [ ] ISC-7: Retrying a successful submission does not create a second event.
- [ ] ISC-8: No token or OAuth client secret appears in tracked files or browser responses.
- [ ] ISC-9: The page remains usable at 390px wide.
- [ ] ISC-10: Anti: the public API does not expose calendar event details.
- [ ] ISC-11: Anti: the public API does not accept an unlisted booking type.
- [ ] ISC-12: The live booking flow passes an end-to-end check before old links change.

## Test Strategy

- ISC-1, ISC-2, ISC-9: render the local page at desktop and mobile widths.
- ISC-3, ISC-4, ISC-7, ISC-10, ISC-11: run server tests with a fake calendar provider.
- ISC-5, ISC-6, ISC-12: make one controlled live booking and inspect the resulting event, then remove the test event.
- ISC-8: inspect tracked files and public API output for secret material.

## Features

- Booking API: calendar availability, policy, validation, idempotent event creation. Satisfies ISC-3 through ISC-8 and ISC-10 through ISC-12.
- Booking page: Dayta visual system, time zone display, type picker, form and confirmation. Satisfies ISC-1, ISC-2 and ISC-9.
- Release: secret storage, hosted API, live smoke check and site link update. Satisfies ISC-8 and ISC-12.
