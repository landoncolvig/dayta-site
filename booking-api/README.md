# Dayta booking API

The static page at `/book/` calls this Cloud Run service. The service reads Landon's Google Calendar free/busy data and creates attendee events on his primary calendar. Calendar OAuth credentials and the reCAPTCHA secret are supplied from Google Secret Manager as `BOOKING_SECRETS`. Keep them out of Git and browser code.

## Release controls

- `BOOKING_ENABLED=0` keeps submissions closed while availability can still be checked.
- `PUBLIC_TYPES` lists the meeting types exposed by `/api/config`. The initial release uses `meeting-with-landon`.
- `ALLOWED_ORIGIN=https://daytanalytics.com` limits browser access to the Dayta site.
- Run Cloud Run with one instance and concurrency one. The service serializes booking submissions and rechecks availability before event creation.
- Google Calendar invitation email is sent by `events.insert?sendUpdates=all`. Visitors change or cancel by replying to the invitation or contacting Landon until self-service management is added.

## Local verification

Run `npm test` in this directory. Tests use a fake calendar and do not create real invitations. Before redirecting existing scheduling links, make a controlled booking on the live site, confirm the calendar event and attendee email, then delete the test event.

## Operations

Cloud Run service: `dayta-booking-api` in `dayta-analytics-sandbox`, `us-central1`. Runtime service account: `dayta-booking-api@dayta-analytics-sandbox.iam.gserviceaccount.com`. Secret: `dayta-booking-credentials`. Existing TidyCal links remain the rollback path until the live booking flow is verified.
