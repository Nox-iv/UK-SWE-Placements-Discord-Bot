const axios = require('axios').default;
const cheerio = require('cheerio');
const mysql = require('mysql2/promise');
const puppeteer = require('puppeteer');
require('dotenv').config();

var placements = [];
var newPlacements = false;

// Start of the program
// ============================================================================================================================
async function scrapePlacements() {
    if (placements.length == 0) {
        var results = await getAllPlacements();
        results.forEach(result => {
            placements.push(result.PLink);
        });
        console.log("Got " + placements.length + " placements...");
    }
    console.log("Scraping placements...");
    console.log("Bright Networks...");
    await getBrightNetworksPlacements();
    console.log("Rate My Placements...");
    await getRatePlacements();
    console.log("Handshake...");
    await getHandshakePlacements();
    return newPlacements;
}

// Initial gets
// ============================================================================================================================
async function getBrightNetworksPlacements() {
    await axios.get('https://www.brightnetwork.co.uk/search/', {
        params: {
            content_types: 'jobs',
            career_path_subsector: 'Software Development',
            job_types: 'Industrial placement',
            sort_by: 'recent'
        }
    })
        .then(async response => {
            await handleBrightNetworkPage(response.data);
        })
        .catch(error => {
            console.log(error);
        });
}

async function getRatePlacements() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(process.env.RATEPLACEMNET_DOMAIN);
    const allResultsSelector = '.SearchResults-results';
    await page.waitForSelector(allResultsSelector);
    const data = await page.evaluate(() => document.querySelector('*').outerHTML);
    await browser.close();
    await handleRatePlacementPage(data);
    return;
}

async function getHandshakePlacements() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const cookies =
        [
            { name: 'hss-global', value: process.env.HANDSHAKE_HSS_GLOBAL_COOKIE, domain: process.env.HANDSHAKE_COOKIE_DOMAIN },
        ]
    await page.setCookie(...cookies);
    await page.goto(process.env.HANDSHAKE_SEARCH_DOMAIN, {
        waitUntil: "networkidle0",
    });
    const data = await page.evaluate(() => document.querySelector('*').outerHTML);
    await browser.close();
    const $ = cheerio.load(data);
    var tem = $('.style__cards-container___52V08').find('[class*=style__card___]')
    for (var i = 0; i < tem.length; i++) {
        var link = process.env.HANDSHAKE_DOMAIN + $(tem[i]).attr('href').split("?")[0];
        if (!await checkPlacement(link)) {
            console.log("Handshake: " + (i+1))
            await handleHandshakePage(link);
        }
    }
}
// ============================================================================================================================


// Initial handlers
// ============================================================================================================================
async function handleBrightNetworkPage(data) {
    const $ = cheerio.load(data);
    const searchResultWrapper = $('.search-result-wrapper').find('.search-result-row');
    for (let i = 0; i < searchResultWrapper.length; i++) {
        var elem = searchResultWrapper[i];
        var titleEle = $(elem).find(".description__title");
        var link = "https://www.brightnetwork.co.uk" + titleEle.find('a').attr('href').split('?')[0];
        if (!await checkPlacement(link)) {
            console.log("Bright Networks: " + (i+1))
            var title = titleEle.find('h3').text()
            var logo = $(elem).find('.logo-container').find('img').attr('src');
            var subtitle = $(elem).find('.search-result-row__subtitle').text();
            var company = subtitle.split(' - ')[0].fixSpace();
            var location = subtitle.split(' - ')[1].fixSpace();
            var deadline = getBrightNetworkDeadline(elem, $);
            var salaryDescription = await getBrightNetworkSalaryDescription(link);
            var salary = salaryDescription[0];
            var description = salaryDescription[1];
            await createPlacement(title, link, logo, company, location, description, deadline, salary);
        }
    }
}

async function handleRatePlacementPage(data) {
    const $ = cheerio.load(data);
    const searchResults = $('.SearchResults-results').find($('.Search--jobs'));
    for (let i = 0; i < searchResults.length; i++) {
        var elem = searchResults[i];
        var searchDescription = $(elem).find('.Search-descriptions');
        var link = searchDescription.attr('href');
        if (!await checkPlacement(link)) {
            console.log("Rate My Placements: " + (i+1))
            var title = searchDescription.find('h2').text()
            var logo = $(elem).find('.Search-companyLogo').find('img').attr('src');
            var company = searchDescription.find('.Search-industry').text().fixSpace();
            var location = searchDescription.find('.Search-label').find('.company').text().fixSpace();
            var description = await getRatePlacementDescription(link);
            var deadline = searchDescription.find('.Search-label').find('.deadline')[0].children[1].data.split("Deadline: ")[1].fixSpace();
            var salary = (searchDescription.find('.Search-label').find('.fa-pound-sign').length == 1) ? searchDescription.find('.Search-label').find('.fa-pound-sign').next().text() : "N/A";
            await createPlacement(title, link, logo, company, location, description, deadline, salary);
        }
    }
}

async function handleHandshakePage(link) {

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const cookies =
        [
            { name: 'hss-global', value: process.env.HANDSHAKE_HSS_GLOBAL_COOKIE, domain: process.env.HANDSHAKE_COOKIE_DOMAIN },
        ]
    await page.setCookie(...cookies);
    let data;
    try {
        await page.goto(link, {
            waitUntil: "networkidle0",
        });
        data = await page.evaluate(() => document.querySelector('*').outerHTML);
    } catch (e) {
        console.log(e);
        return;
    }
    const $ = cheerio.load(data);
    await browser.close();

    var title = $('.style__job-title___P7PJV').text();
    var logo = $('.style__avatar-image___2LV5H')[0].attribs.style;
    logo = logo.replace('background-image: url("', '').replace('");', '').split('?')[0];
    var company = $('.style__employer-name___54lqg').text();
    var location = $('.style__media-body___MV2ef').children().last().text();

    var description = "";
    $($('.style__tight___RF4uH')[0].children[0]).children().each(function (i, elem) {
        description += $(elem).text() + '\r\n';
    });
    description = description.slice(0, 4000);

    var deadline = $('.style__content___w3TUd')[0].children[0].data;

    var salaryElems = $('.style__col___5FTI6').filter(function (i, elem) {
        if ($(elem).attr('data-hook') == 'estimated-pay') return true;
        return false;
    })
    var salary = (salaryElems.length == 1) ? salaryElems.children()[1].children[0].data : "N/A";

    await createPlacement(title, link, logo, company, location, description, deadline, salary);
    return;
}
// ============================================================================================================================

// Bright Network functions
// ============================================================================================================================
function getBrightNetworkDeadline(elem, $) {
    var deadlineTitle = $(elem).find('.deadline-title').text();
    var deadline = "";
    if (deadlineTitle != 'Rolling deadline') {
        $(elem).find('.text-start').find('.date-container').find('span').each(function (iSub, elemSub) {
            (iSub == 0) ? deadline += $(elemSub).text() + ' ' : deadline += $(elemSub).text();
        });
    } else {
        deadline = 'Rolling deadline';
    }
    return deadline;
}

async function getBrightNetworkSalaryDescription(link) {
    return await axios.get(link)
        .then(response => {
            const $ = cheerio.load(response.data);

            var descriptionHTML = $('.section__description');
            var description = descriptionHTML.text().trim().slice(0, 4000);

            var salary;
            var salaryHTML = $('.field-salary');
            if (salaryHTML.length == 1) {
                salary = "£" + parseInt($('.field-salary').find('.field-value').text().replace(/[£,.]/gm, '').fixSpace()).toLocaleString();
            } else {
                salary = "N/A";
            }

            return [salary, description];
        })
        .catch(error => {
            return "N/A";
        });
}
// ============================================================================================================================


// Rate My Placement functions
// ============================================================================================================================
async function getRatePlacementDescription(link) {
    return await axios.get(link)
        .then(response => {
            const $ = cheerio.load(response.data);
            var description = $('.ProfileContentCrm');
            description.find('div').remove();
            description.find('h2').remove();
            return description.text().trim().slice(0, 4000);
        })
        .catch(error => {
            return "N/A";
        });
}
// ============================================================================================================================


// Database functions
// ============================================================================================================================
async function createPlacement(title, link, logo, company, location, description, deadline, salary) {
    let con = await createCon();
    try {
        const query = 'INSERT INTO placements (PTitle, PLink, PLogo, PCompany, PLocation, PDescription, PDeadline, PSalary) VALUES (?,?,?,?,?,?,?,?)';
        const [result] = await con.execute(query, [title, link, logo, company, location, description, deadline, salary]);
        placements.push(link);
        newPlacements = true;
    } catch (err) {
        console.error(err);
    } finally {
        if (con) con.end();
    }
}

async function getAllPlacements() {
    let con = await createCon();
    try {
        const query = 'SELECT * FROM placements';
        const [result] = await con.execute(query);
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
// ============================================================================================================================

// Utility functions
// ============================================================================================================================
String.prototype.fixSpace = function () {
    return this.replace(/\s+/g, ' ').trim();
}

async function checkPlacement(link) {
    return placements.includes(link);
}
// ============================================================================================================================

module.exports = {
    scrapePlacements: scrapePlacements
}