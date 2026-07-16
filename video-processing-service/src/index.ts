import express from "express";
import ffmpeg from "fluent-ffmpeg";

const app = express();

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
        res.status(200).send("Video processing finished successfully.")
    })
    .on("error", (err) => {
        console.log(`An error occured: ${err.message}`);
        res.status(500).send(`500 Internal Server Error: ${err.message}`);
    })
    .save(outputFilePath);  
});

const port = process.env.PORT || 3000; // port is undefined so set to 3000

app.listen(port, () => {
    console.log(
        `Video Processing Service listening at http://localhost:${port}`)
})