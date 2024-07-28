## ServiceNow wakeup app

- Aimed to keep ServiceNow developer instance from sleeping
- The app keeps updating a ticket in ServiceNow, if it detects that the instance is hibernating, attempts to wake up the instance with Selenium by logging in to the `developer.servicenow.com` page
- When the app is sending ticket updates to ServiceNow, the instance can be set to ping back. This feature was needed to keep the Heroku dyno from hibernating
