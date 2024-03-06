const { FingerprintJsServerApiClient } = require('@fingerprintjs/fingerprintjs-pro-server-api');
const express = require("express")
const dotenv = require("dotenv")
const cors = require("cors")

let app = express()

app.use(express.json());
dotenv.config()
app.use(cors())

const client = new FingerprintJsServerApiClient({
    apiKey: process.env.FINGERPRINT_SERVER_API_KEY,
    region: process.env.FINGERPRINT_REGION,
});

app.post("/api/visitorInfo", (req, res) => {

    const visitorId = req.body.visitorId

    client
        .getVisitorHistory(visitorId)
        .then((visitorHistory) => {
            res.json(visitorHistory.visits ? visitorHistory.visits[0] : {})
        })
        .catch((error) => {
            console.error(error)
            res.json({ "message": "Something went wrong. Please try with another visitorId" })
        });

})

app.post("/api/requestInfo", (req, res) => {
    const requestId = req.body.requestId

    client.getEvent(requestId)
        .then((event) => {
            res.json(event)
        }).catch((error) => {
            console.error(error)
            res.json({ "message": "Something went wrong. Please try with another visitorId" })
        });

})

app.listen(3001)