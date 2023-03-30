import { JSDOM } from "jsdom";
import * as fs from "fs";

const DAY_LOOKUP = {
    "Mo": "Monday",
    "Di": "Tuesday",
    "Mi": "Wednesday",
    "Do": "Thursday",
    "Fr": "Friday"
};

function extractData(document) {
    const title = document.getElementById("contentTop").textContent.replace("\n", "");
    const courseID = title.split(/ +/)[0];
    const courseName = title.split(/ +/).slice(1).join(" ");

    const courseTable = [...document.querySelectorAll(".inside > table")[1].querySelector("tbody").children].slice(1);

    let hours = {};

    for (const row of courseTable) {
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
    return {
        name: courseName,
        id: courseID,
        hours: hours
    };
}

/*

const MAIN_REQ_URL = "https://www.vorlesungen.ethz.ch/Vorlesungsverzeichnis/sucheLehrangebot.view?lang=de&search=on&semkez=2023S&studiengangTyp=&deptId=&studiengangAbschnittId=102579&bereichAbschnittId=&lerneinheitstitel=&lerneinheitscode=&famname=&rufname=&wahlinfo=&lehrsprache=&periodizitaet=&kpRange=0%2C999&katalogdaten=&_strukturAus=on&search=Suchen";

async function main() {
    let getURL = page => `https://www.vorlesungen.ethz.ch/Vorlesungsverzeichnis/sucheLehrangebot.view?lerneinheitscode=&deptId=&famname=&unterbereichAbschnittId=&seite=${page}&lerneinheitstitel=&rufname=&kpRange=0,999&lehrsprache=&bereichAbschnittId=&semkez=2023S&studiengangAbschnittId=102579&studiengangTyp=&ansicht=1&lang=de&katalogdaten=&wahlinfo=`;
    let i = 0;
    for (let page = 1; page <= 3; page++) {
        let fReq = await fetch(getURL(page));
        let html = await fReq.text();
        let dom = new JSDOM(html);
        let courseRows = Array.from(dom.window.document.querySelectorAll("table tr")).filter(e => e.children.length == 6 && e.children[0].nodeName == "TD");
        for (const r of courseRows) {
            const link = r.querySelector("a").href;
            let lid = link.match(/lerneinheitId=(\d+)/)[1];
            let unitReq = await fetch(`https://www.vorlesungen.ethz.ch${link}`);
            let unitHTML = await unitReq.text();
            console.log(`https://www.vorlesungen.ethz.ch${link}`);
            console.log(unitReq.status);
            await new Promise(resolve => setTimeout(resolve, 1000));
            fs.writeFileSync(`scrape_result/${lid}.html`, unitHTML);
            console.log(`Course #${i++} downloaded.`);
        }
        console.log("Going to page " + (page + 1));
    }
}
main();

*/

let dataset = {};

for (const file of fs.readdirSync("scrape_result")) {
    const html = fs.readFileSync(`scrape_result/${file}`, "utf-8");
    const dom = new JSDOM(html.replace(/&nbsp;/g, " ").replace(/\u00a0/g, ""));
    const data = extractData(dom.window.document);
    dataset[data.id] = {
        name: data.name,
        hours: data.hours
    };
    console.log(file, data.id, data.name);
}

fs.writeFileSync("coursedata.json", JSON.stringify(dataset));
