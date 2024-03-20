const { FingerprintJsServerApiClient } = require('@fingerprintjs/fingerprintjs-pro-server-api');
const express = require("express")
const dotenv = require("dotenv")
const cors = require("cors")
const db = await JSONFilePreset('db.json', { users: [] })

let app = express()

app.use(express.json());
dotenv.config()
app.use(cors())

const client = new FingerprintJsServerApiClient({
    apiKey: process.env.FINGERPRINT_SERVER_API_KEY,
    region: process.env.FINGERPRINT_REGION,
});

const validateIds = async (requestId, visitorId) => {
    const eventData = await client.getEvent(requestId);

    const errors = [];

    // Make sure the visitor ID from the server API matches the one in the request body
    if (eventData.products.identification.data.visitorId !== visitorId) {
        errors.push("Forged visitor ID");
    }

    // The time between the server identification timestamp and the request timestamp should be less than 120 seconds
    let timeDifference = Math.floor(
        (new Date().getTime() -
            eventData.products.identification.data.timestamp) /
            1000
    );
    if (timeDifference > 120) {
        errors.push("Forged request ID");
    }

    // Make sure the user is not a bot
    if (eventData.products.botd.data.bot.result === "bad") {
        errors.push("Bot alert");
    }

    // Make sure the user is not using a VPN
    if (eventData.products.vpn.data.result === true) {
        errors.push("VPN alert");
    }

    return {
        errors,
        fingerprint: eventData.products.identification.data.visitorId   
    }
}

const createUser = async (email, password, fingerprint, onSuccess, onError) => {
    try {
        const { users } = db.data;
        // Check if the fingerprint already exists
        let usersWithCurrentFingerprint = await users.map(user => user.fingerprint === fingerprint);

        // Check if the fingerprint was added in the last 30 minutes
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago

        const signupsWithinLastThirtyMinutes = usersWithCurrentFingerprint.map(user => user.createdAt > thirtyMinutesAgo)

        // Check if more than a certain number of signups have occurred within the last 30 minutes
        const maxSignupsAllowed = 1; // Only one signup is allowed every 30 minutes
        if (signupsWithinLastThirtyMinutes.length >= maxSignupsAllowed) {
            // Handle the condition where more than the allowed number of signups occurred within the last 30 minutes
            return {message: "Unable to create an account. Only one account can be created every 30 minutes.", error: true};
        }

        // Save the user with the existing fingerprint reference
        await db.update(({ users }) => users.push({ email, password, fingerprint }))

        // Redirect the user to the dashboard upon successful registration
        return { message: "User created successfully", error: false };
    } catch (error) {
        console.error(error)
    }
};

app.post("/register", async (req, res) => {
    
    // Extract request data
    const { email, password, requestId, visitorId } = req.body

    // Perform validation
    const validation = await validateIds(requestId, visitorId)

    // Render appropriate errors
    if(validation.errors.length > 0){
        return res.json({ errors: validation.errors })
    }

    // Create user
    let result = await createUser(email, password, validation.fingerprint)

    if (result.error) {
        res.status(400)
    }
    
    res.json({message: result.message})
    
})


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
