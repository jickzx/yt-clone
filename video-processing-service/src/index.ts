import express from "express";
import ffmpeg from "fluent-ffmpeg";

const app = express();
const port = 3000;

app.get("/", (req, res) => { // anonymous function
    res.send("Hello World!")
})

app.listen(port, () => {
    console.log(
        `Video Processing Service listening at http://localhost:${port}`)
})