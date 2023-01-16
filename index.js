"use strict";

require('dotenv/config');
const mysql = require('mysql2/promise');
const { Client, EmbedBuilder, Events, GatewayIntentBits, ActivityType } = require('discord.js')
const scraper = require('./scraper');

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

    var channel = await client.channels.cache.get('1063942879208296580');

    scraper.scrapePlacements()
    setInterval(async () => {
        scraper.scrapePlacements();
    }, 600000)


    postPlacements(channel);

});


async function postPlacements(channel) {
    while(true) {
        var placements = await getUnpostedPlacements();
        if (placements.length != 0) {
            console.log("Posting " + placements.length + " placements...");
            for (var i = 0; i < placements.length; i++) {
                await handleEmbed(channel, placements[i].PTitle, placements[i].PLink, placements[i].PLogo, placements[i].PCompany, placements[i].PLocation, placements[i].PDescription, placements[i].PDeadline, placements[i].PSalary);
                await updatePlacement(placements[i].PLink);
                await delay(150000);
            }
        }
        await delay(150000);
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

async function getUnpostedPlacements(link) {
    let con = await createCon();
    try {
        const query = 'SELECT * FROM placements WHERE PPosted = "0"';
        const [result] = await con.execute(query);
        return result;
    } catch (err) {
        console.error(err);
    } finally {
        if (con) con.end();
    }
}

async function updatePlacement(link) {
    let con = await createCon();
    try {
        const query = 'UPDATE placements SET PPosted = "1" WHERE PLink = ?';
        const [result] = await con.execute(query, [link]);
        return result;
    } catch (err) {
        console.error(err);
    } finally {
        if (con) con.end();
    }
}

async function createCon() {
    let con;
    try {
        con = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: process.env.DB
        });
    } catch (err) {
        console.error(err);
    }
    return con;
}

client.login(process.env.TOKEN);