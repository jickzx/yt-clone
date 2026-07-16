import express from "express";
import ffmpeg from "fluent-ffmpeg";

const app = express();
const port = 3000;

app.get("/process-video", (req, res) => { // anonymous function
    // get path of input video file from request body
    const inputFilePath = req.body.inputFilePath;
    const outputFilePath = req.body.outputFilePath;

    if (!inputFilePath || !outputFilePath) {
        res.status(400).send("400 Bad Request. Missing File Path.");
    }
    ffmpeg(inputFilePath)
    .outputOptions("-vf", "scale=-1:360") // video file, scale 1 to 360p
    .on("end", () => {

    })
    .on("error", (err) => {
        console.log(`An error occured: ${err.message}`);
        res.status(500).send(`500 Internal Server Error: ${err.message}`);
    })
    .save(outputFilePath);  

    return res.status(200).send("Video processing started.")
});

app.listen(port, () => {
    console.log(
        `Video Processing Service listening at http://localhost:${port}`)
})