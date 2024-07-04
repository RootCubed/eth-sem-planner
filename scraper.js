import { JSDOM } from "jsdom";
import * as fs from "fs";
import { argv } from "process";
import { parseArgs } from "node:util";

const args = parseArgs({
    args: argv.slice(2),
    options: {
        // en
        language: {
            type: "string",
            short: "l"
        },
        // BCS, MCS, etc.
        degree_name: {
            type: "string",
            short: "d"
        },
        // Usually '5' for Computer Science
        dept_id: {
            type: "string",
            short: "i"
        },
        semester: {
            type: "string",
            short: "s"
        },
        output_file: {
            type: "string",
            short: "o"
        }
    }
}).values;

const I18N_CONSTANTS = {
    de: {
        DAY_LOOKUP: {
            "Mo": "Monday",
            "Di": "Tuesday",
            "Mi": "Wednesday",
            "Do": "Thursday",
            "Fr": "Friday"
        },
        PAGE_REGEX: /Seite 1 von (\d+)/,
        CREDITS_REGEX: /<td>\d+ KP<\/td>/g,
    },
    en: {
        DAY_LOOKUP: {
            "Mon": "Monday",
            "Tue": "Tuesday",
            "Wed": "Wednesday",
            "Thu": "Thursday",
            "Fri": "Friday"
        },
        PAGE_REGEX: /Page 1 of (\d+)/,
        CREDITS_REGEX: /<td>\d+ credits?<\/td>/g
    }
};

class Config {
    constructor(args) {
        this.language = args.language;
        this.sem = args.semester;
        this.degreeName = args.degree_name;
        this.outputFile = args.output_file;
        this.deptId = args.dept_id;
    }

    get scrapeFolder() {
        return `scrape_result_${this.language}_${this.deptId}_${this.sem}`;
    }

    getLangConst(id) {
        return I18N_CONSTANTS[this.language][id];
    }
}

function extractData(config, document) {
    const title = document.getElementById("contentTop").textContent.replace("\n", "");
    const courseID = title.split(/ +/)[0];
    const courseName = title.split(/ +/).slice(1).join(" ");

    const hoursTable = [...document.querySelectorAll(".inside > table")[1].querySelector("tbody").children].slice(1);

    let hours = {};

    for (const row of hoursTable) {
        const courseType = row.querySelectorAll("td")[0].textContent.split(" ")[1];
        const numHours = parseInt(row.querySelectorAll("td")[2].textContent);
        const table = row.querySelectorAll("td")[3];

        const fields = table.getElementsByTagName("td");
        let currDay = "";
        let data = [];
        for (let i = 0; i < fields.length; i += 3) {
            if (fields[i].textContent != "") {
                currDay = config.getLangConst("DAY_LOOKUP")[fields[i].textContent];
                if (currDay == undefined) {
                    currDay = fields[i].textContent;
                }
            }
            const time = fields[i + 1].textContent;
            const timeFrom = parseInt(time.split("-")[0].split(":")[0]);
            const timeTo = parseInt(time.split("-")[1].split(":")[0]);

            data.push({
                room: fields[i + 2].textContent.replace(" »", ""),
                time: currDay + "-" + timeFrom + "/" + (timeTo - timeFrom)
            });
        }
        hours[courseType] = {
            hourCount: numHours,
            hours: data
        };
    }

    const performanceTable = document.querySelectorAll(".inside > table")[3].querySelector("tbody");
    const ectsList = performanceTable.innerHTML.match(config.getLangConst("CREDITS_REGEX"));
    if (ectsList.length > 1) {
        console.warn("Course specifies multiple ECTS credit amounts! Please manually check this course:", courseID, courseName);
    }
    const ectsCredits = parseInt(ectsList[0].match(/\d+/g));

    let assignmentOptions = [];

    const offeredInTable = [...document.querySelectorAll(".inside > table")[7].querySelector("tbody").children].slice(1);
    for (const row of offeredInTable) {
        const programName = row.querySelectorAll("td")[0].textContent;
        const sectionName = row.querySelectorAll("td")[1].textContent;
        if (programName == config.getLangConst("DEGREE_NAME")) {
            assignmentOptions.push(sectionName);
        }
        if (programName == "Wissenschaft im Kontext (Science in Perspective)" && sectionName == "D-INFK") {
            assignmentOptions.push("GESS");
        }
    }

    const englLink = document.getElementsByClassName("engl")[0];
    const vvzLink = "https://www.vorlesungen.ethz.ch" + englLink.href;

    return {
        name: courseName,
        id: courseID,
        ectsCredits: ectsCredits,
        vvzLink: vvzLink,
        assignmentOptions: assignmentOptions,
        hours: hours
    };
}

const baseUrl = "https://www.vorlesungen.ethz.ch/Vorlesungsverzeichnis";
const getCourseListLink = (page, sem, deptId, lang) => `${baseUrl}/sucheLehrangebot.view?deptId=${deptId}&seite=${page}&semkez=${sem}&lang=${lang}`;
const getLink = (sem, lid, lang) => `${baseUrl}/lerneinheit.view?semkez=${sem}&ansicht=ALLE&lerneinheitId=${lid}&lang=${lang}`;

async function downloadCourses(config) {
    let endPage;
    let currPage = 1;
    do {
        let fReq = await fetch(getCourseListLink(currPage, config.sem, config.deptId, config.language));
        let html = await fReq.text();
        if (!endPage) {
            endPage = parseInt(html.replace(/\s+/g, " ").match(config.getLangConst("PAGE_REGEX"))[1]);
            if (!(endPage >= 1 && endPage <= 100)) {
                console.error("Invalid endPage:", endPage);
                process.exit();
            }
        }
        let dom = new JSDOM(html);
        let courseRows = Array.from(dom.window.document.querySelectorAll("table tr")).filter(e => e.children.length == 6 && e.children[0].nodeName == "TD");
        for (const r of courseRows) {
            const link = r.querySelector("a").href;
            let lid = link.match(/lerneinheitId=(\d+)/)[1];
            let unitReq = await fetch(getLink(config.sem, lid, config.language));
            let unitHTML = await unitReq.text();
            console.log(lid, "returned", unitReq.status);
            await new Promise(resolve => setTimeout(resolve, 1000));
            fs.writeFileSync(`${config.scrapeFolder}/${lid}.html`, unitHTML);
        }
        currPage++;
        console.log("Going to page", currPage);
    } while (currPage <= endPage);
}

async function main() {
    const conf = new Config(args);

    if (!fs.existsSync(conf.scrapeFolder)) {
        fs.mkdirSync(conf.scrapeFolder);
        await downloadCourses(conf);
    }

    let dataset = {};

    for (const file of fs.readdirSync(conf.scrapeFolder)) {
        const html = fs.readFileSync(`${conf.scrapeFolder}/${file}`, "utf-8");
        const dom = new JSDOM(html.replace(/&nbsp;/g, " ").replace(/\u00a0/g, ""));
        const data = extractData(conf, dom.window.document);
        dataset[data.id] = data;
        delete dataset[data.id].id;
    }

    fs.writeFileSync(conf.outputFile, JSON.stringify(dataset));
}

main();
