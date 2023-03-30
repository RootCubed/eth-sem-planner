import express from "express";
import fs from "fs";

const app = express();
app.use(express.static("./dist"));

const lectureData = JSON.parse(fs.readFileSync("coursedata.json", "utf-8"));

app.get("/resources/:sem", async (req, res) => {
    res.json(lectureData);
});

const PORT = parseInt(process.env.PORT ?? "3000");

app.listen(PORT, () => console.log("Web server is up and running on port " + PORT));

process.on("unhandledRejection", (reason, p) => {
    console.log("Unhandled Rejection at: Promise", p, "reason:", reason);
    console.trace();
});

process.on("uncaughtException", err => {
    console.error("Uncaught error thrown:", err);
    console.trace();
    process.exit(1);
});
