"use strict";

const dotenv = require('dotenv')
const dotenvExpand = require('dotenv-expand');
const { Client, EmbedBuilder, Events, GatewayIntentBits, ActivityType } = require('discord.js')
const {MongoClient} = require('mongodb');
const scraper = require('./scraper');

var myEnv = dotenv.config()
dotenvExpand.expand(myEnv);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.once(Events.ClientReady, async c => {
    console.log(`Ready! Logged in as ${c.user.tag}`);

    await client.user.setPresence({
        activities: [{ name: `https://nox-iv.com/`, type: ActivityType.Watching }]
    });

    var channel = await client.channels.cache.get(process.env.POSTING_CHANNEL);

    let res = await scraper.scrapePlacements()
    postPlacements(channel);
    setInterval(async () => {
        res = await scraper.scrapePlacements();
        if (res == true) postPlacements(channel);
    }, 1800000)

});


async function postPlacements(channel) {
    var placements = await getUnpostedPlacements();
    if (placements.length != 0) {
        console.log("Posting " + placements.length + " placements...");
        for (var i = 0; i < placements.length; i++) {
            await handleEmbed(channel, placements[i].PTitle, placements[i].PLink, placements[i].PLogo, placements[i].PCompany, placements[i].PLocation, placements[i].PDescription, placements[i].PDeadline, placements[i].PSalary);
            await updatePlacement(placements[i].PLink);
            await delay(150000);
        }
    }
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function handleEmbed(channel, title, link, logo, company, location, description, deadline, salary) {
    if (logo.includes(".svg")) {
        logo = "https://cdn-icons-png.flaticon.com/512/3524/3524335.png";
    }
    const placementEmbed = new EmbedBuilder()
        .setColor('#2F3136')
        .setTitle(title)
        .setAuthor({ name: company })
        .setURL(link)
        .setDescription(description)
        .setThumbnail(logo)
        .addFields(
            { name: '\u200B', value: ' ' },
            { name: 'Location', value: location },
            { name: '\u200B', value: ' ' },
            { name: 'Salary', value: salary },
            { name: '\u200B', value: ' ' },
            { name: 'Deadline', value: deadline }
        )
    await channel.send({ embeds: [placementEmbed] });
    return;
}

async function getUnpostedPlacements() {
    let client;
    try {
        client = await connectToMongo();
        const collection = client.db(process.env.MONGO_DB).collection(process.env.MONGO_COLLECTION);
        const res = await collection.find({ PPosted: 0 }).toArray();
        return res;
    } catch (err) {
        console.log(err);
        return;
    } finally {
        if (client) {
            await client.close();
        }
    }
}

async function updatePlacement(link) {
    let client;
    try {
        client = await connectToMongo();
        const collection = client.db(process.env.MONGO_DB).collection(process.env.MONGO_COLLECTION);
        const res = await collection.updateOne({ PLink : link }, { $set: { PPosted : 1 } });
        if (res.modifiedCount == 0 && res.matchedCount == 0) return false;
        return true;
    } catch (err) {
        console.log(err);
        return false;
    } finally {
        if (client) {
            await client.close();
        }
    }
}

async function connectToMongo() {
    try {
        const client = new MongoClient(process.env.MONGO_URI, { useUnifiedTopology: true });
        await client.connect();
        return client;
    } catch (e) {
        console.log(e);
        return false;
    }
}

client.login(process.env.TOKEN);