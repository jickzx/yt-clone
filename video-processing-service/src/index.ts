import express from "express";
import ffmpeg from "fluent-ffmpeg";
import {downloadRawVideo, deleteRawVideo, deleteProcessedVideo, setupDirectories, uploadProcessedVideo, convertVideo} from "./storage";

setupDirectories();

const app = express();
app.use(express.json());

app.post("/process-video", async (req, res) => { // anonymous function
    // get bucket and filename from cloud pub/sub message
    let data;
    try { 
        const message = Buffer.from(req.body.message.data, 'base64').toString('utf8');
        data = JSON.parse(message);
        if (!data.name) {
            throw new Error('Invalid message payload received.');
        }
    } catch (error) {
        console.error(error);
        return res.status(400).send('Bad request: missing filename.')
    }

    const inputFileName = data.name;
    const outputFileName = `processed-${inputFileName}`;

    // download video from cloud storage
    await downloadRawVideo(inputFileName);

    // convert vid to 360p
    try {
        await convertVideo(inputFileName, outputFileName);
    } catch (err) {
        await Promise.all([
        deleteRawVideo(inputFileName),
        deleteProcessedVideo(outputFileName)
        ]);

        console.error(err);
        return res.status(500).send('Internal Server Error: video processing failed.');
    }

    // upload processed vid to cloud storage 
    await uploadProcessedVideo(outputFileName);

    await Promise.all([
    deleteRawVideo(inputFileName),
    deleteProcessedVideo(outputFileName)
    ]);

    return res.status(200).send(`Processing finished successfully`)
});

const port = process.env.PORT || 3000; // port is undefined so set to 3000

app.listen(port, () => {
    console.log(
        `Video Processing Service listening at http://localhost:${port}`)
})