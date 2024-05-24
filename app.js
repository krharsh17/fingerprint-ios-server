import { FingerprintJsServerApiClient } from '@fingerprintjs/fingerprintjs-pro-server-api';
import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import { JSONFilePreset } from 'lowdb/node'
import bcrypt from "bcrypt"
const saltRounds = 10

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

    return {
        errors,
        fingerprint: eventData.products.identification.data.visitorId   
    }
}

const createUser = async (email, password, fingerprint, onSuccess, onError) => {
    try {
        const db = await JSONFilePreset('./db.json', { users: [] })
        let users = db.data.users || [];

        // Check if the fingerprint already exists
        let usersWithCurrentFingerprint = users.filter(user => user.fingerprint === fingerprint);

        // Check if the fingerprint was added in the last 30 minutes
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago

        const signupsWithinLastThirtyMinutes = usersWithCurrentFingerprint.filter(user => user.createdAt > thirtyMinutesAgo.valueOf())

        // Check if more than a certain number of signups have occurred within the last 30 minutes
        const maxSignupsAllowed = 5; // Only five new accounts are allowed every 30 minutes
        if (signupsWithinLastThirtyMinutes.length >= maxSignupsAllowed) {
            return {message: "Unable to create an account. Only five accounts can be created every 30 minutes.", error: true};
        }

        const hashedPassword = await bcrypt.hash(password, saltRounds)

        // Add a check here to see if a user with the same email exists already. This is usually done through ORMs, so a manual implementation for lowdb has been ommitted here.

        // Save the user with the existing fingerprint reference
        db.data.users.push({ email, password: hashedPassword, fingerprint, createdAt: Date.now() })
        await db.write()

        // Redirect the user to the dashboard upon successful registration
        return { message: "User created successfully", error: false };
    } catch (error) {
        console.error(error)
    }
};

app.post("/register", async (req, res) => {

    try{

        console.log(req.body)
    
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
} catch (e) {
    console.error(e)
    res.status(400).json({message: e.message})
}
    
})

app.post("/api/visitorInfo", (req, res) => {

    const visitorId = req.body.visitorId

    client
        .getVisitorHistory(visitorId)
        .then((visitorHistory) => {
            res.json(visitorHistory)
        })
        .catch((error) => {
            console.error(error)
            res.json({ "message": "Something went wrong. Please try with another visitorId" })
        });

})

app.listen(3001)
