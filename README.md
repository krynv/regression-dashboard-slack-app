# Slack Application for the [egression Test Dashboard](https://github.com/krynv/regression-dashboard)

[_Dashboard 2.0_](https://github.com/krynv/regression-dashboard) now features Slack integration! 

Install dependencies:

    npm i

Run the server:

    CLIENT_ID=<xxx.yyy> CLIENT_SECRET=<my 1337 cl13n7 53cr3t> VERIFICATION_TOKEN=<v3r1f1c4t10n t0k3n> npm start

(Make sure to replace the placeholder values above - obviously)

Once the application is running, on the machine you're running the slack application on, navigate to: `localhost:1336/login` in your browser of choice and authorise the app. 

You should receive a notification saying `Success!`. 

If not, go back and check the application's `Redirect URL` over at the `oauth` page of the application's settings page on the Slack website - here you should see a URL containing the IP address of the machine followed by /oauth like so: http://11.11.11.123:1336/oauth

Application documentation to follow...
