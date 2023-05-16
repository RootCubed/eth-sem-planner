import express from "express";

const app = express();
app.use(express.static("./dist"));

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
