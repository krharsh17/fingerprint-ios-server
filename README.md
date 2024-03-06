# Sample Server for Fingerprint

This is a sample server for interacting with the Fingerprint APIs developed for an iOS-focused article.

To run this, follow the steps given below:
1. Make sure you have [Node.js and npm](https://nodejs.org/) installed.
2. Clone the repo locally
3. Install the dependencies by running the following command: `npm i`
4. Rename `.env.example` to `.env` and fill in the Fingerprint Server API key and Region. If you don't have these, [create a new Fingerprint trial account](https://dashboard.fingerprint.com/signup) and get them from App Settings > API Keys.
5. Run `node app.js` to start the server. The server will be live at `http://localhost:3001/`. You can now use the endpoints `/api/visitorInfo` and `/api/requestInfo` to access the details of the visitor.
6. To be able to access the URLs from an iOS app, you will need to set up remote URL for the server. To avoid having to deploy the server remotely to generate a remote URL, you can use HTTP tunnelling. To do this, 
    1. [Install ngrok locally](https://ngrok.com/download) (For macOS, run `brew install ngrok/ngrok/ngrok`)
    2. Sign up on [https://dashboard.ngrok.com/signup](https://dashboard.ngrok.com/signup) to get an auth token
    3. Run `ngrok config add-authtoken <token>` to add the auth token locally. 
    4. Now, run `ngrok http 3001` to start HTTP tunnelling. 
    5. Ngrok will display a remote URL that you can use to access your server (similar to  https://f88c-27-58-207-59.ngrok-free.app). You can append the endpoints at the end of this URL to access the server from anywhere in the world (i.e. https://f88c-27-58-207-59.ngrok-free.app/api/visitorInfo & https://f88c-27-58-207-59.ngrok-free.app/api/requestInfo)