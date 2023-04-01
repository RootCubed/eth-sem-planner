import { JSDOM } from "jsdom";
import * as fs from "fs";

/*
// English
const DAY_LOOKUP = {
    "Mon": "Monday",
    "Tue": "Tuesday",
    "Wed": "Wednesday",
    "Thu": "Thursday",
    "Fri": "Friday"
};
const DEGREE_NAME = "Computer Science Bachelor";
const PAGE_REGEX = /Page 1 of (\d+)/;
const CREDITS_REGEX = /<td>\d+ credits<\/td>/g;
*/
// German
const DAY_LOOKUP = {
    "Mo": "Monday",
    "Di": "Tuesday",
    "Mi": "Wednesday",
    "Do": "Thursday",
    "Fr": "Friday"
};
const DEGREE_NAME = "Informatik Bachelor";
const PAGE_REGEX = /Seite 1 von (\d+)/;
const CREDITS_REGEX = /<td>\d+ KP<\/td>/g;

const CONFIG = {
    lang: "de",
    studyDirID: 102579,
    sem: "2023S"
};

function extractData(document) {
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
                currDay = DAY_LOOKUP[fields[i].textContent];
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
    const ectsList = performanceTable.innerHTML.match(CREDITS_REGEX);
    if (ectsList.length > 1) {
        console.warn("Course specifies multiple ECTS credit amounts! Please manually check this course:", courseID, courseName);
    }
    const ectsCredits = parseInt(ectsList[0].match(/\d+/g));

    let assignmentOptions = [];

    const offeredInTable = [...document.querySelectorAll(".inside > table")[7].querySelector("tbody").children].slice(1);
    for (const row of offeredInTable) {
        const programName = row.querySelectorAll("td")[0].textContent;
        const sectionName = row.querySelectorAll("td")[1].textContent;
        if (programName == DEGREE_NAME) {
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

const getCourseListLink = (page, sem, studydir, lang) => `https://www.vorlesungen.ethz.ch/Vorlesungsverzeichnis/sucheLehrangebot.view?lerneinheitscode=&deptId=&famname=&unterbereichAbschnittId=&seite=${page}&lerneinheitstitel=&rufname=&kpRange=0,999&lehrsprache=&bereichAbschnittId=&semkez=${sem}&studiengangAbschnittId=${studydir}&studiengangTyp=&ansicht=1&lang=${lang}&katalogdaten=&wahlinfo=`;
const getLink = (sem, lid, lang) => `https://www.vorlesungen.ethz.ch/Vorlesungsverzeichnis/lerneinheit.view?semkez=${sem}&ansicht=ALLE&lerneinheitId=${lid}&lang=${lang}`;

async function downloadCourses(config) {
    let endPage;
    let currPage = 1;
    do {
        let fReq = await fetch(getCourseListLink(currPage, config.sem, config.studyDirID, config.lang));
        let html = await fReq.text();
        if (!endPage) {
            endPage = parseInt(html.replace(/\s+/g, " ").match(PAGE_REGEX)[1]);
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
            let unitReq = await fetch(getLink(config.sem, lid, config.lang));
            let unitHTML = await unitReq.text();
            console.log(lid, "returned", unitReq.status);
            await new Promise(resolve => setTimeout(resolve, 1000));
            fs.writeFileSync(`scrape_result/${lid}.html`, unitHTML);
        }
        currPage++;
        console.log("Going to page", currPage);
    } while (currPage <= endPage);
}

async function main(config) {
    if (!fs.existsSync("scrape_result")) {
        fs.mkdirSync("scrape_result");
    }
    await downloadCourses(config);

    let dataset = {};

    for (const file of fs.readdirSync("scrape_result")) {
        const html = fs.readFileSync(`scrape_result/${file}`, "utf-8");
        const dom = new JSDOM(html.replace(/&nbsp;/g, " ").replace(/\u00a0/g, ""));
        const data = extractData(dom.window.document);
        dataset[data.id] = data;
        delete dataset[data.id].id;
    }

    fs.writeFileSync("coursedata.json", JSON.stringify(dataset));
}

main(CONFIG);
