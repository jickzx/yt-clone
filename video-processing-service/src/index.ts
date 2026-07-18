import express from "express";
import ffmpeg from "fluent-ffmpeg";

const app = express();
app.use(express.json());

app.post("/process-video", (req, res) => { // anonymous function
    // get path of input video file from request body
    const inputFilePath = req.body.inputFilePath;
    const outputFilePath = req.body.outputFilePath;

    if (!inputFilePath || !outputFilePath) {
        res.status(400).send("400 Bad Request. Missing File Path.");
    }
});

const port = process.env.PORT || 3000; // port is undefined so set to 3000

app.listen(port, () => {
    console.log(
        `Video Processing Service listening at http://localhost:${port}`)
})