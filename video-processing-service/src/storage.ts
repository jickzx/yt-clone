// gcs file interactions & local file interactions 

import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';

const storage = new Storage();

const rawVideoBucketName = "jickzx-raw-videos";
const processedVideoBucketName = "jickzx-processed-videos";

const localRawVideoPath = "./raw-videos";
const localProcessedVideoPath = "./processed-videos";

// creates local directories for raw and processed videos

export function setupDirectories() {

}

/**
 * @param rawVideoName - The name of the file to convert from {@link localRawVideoPath}.
 * @param processedVideoName - The name of the file to convert to {@link localProcessedVideoPath}.
 * @returns A promise that resolves when the video has been converted.
 */

export function convertVideo(rawVideoName: string, processedVideoName: string) {
    ffmpeg(`${localRawVideoPath}/${localProcessedVideoPath}`)
    .outputOptions("-vf", "scale=-1:360") // video file, scale 1 to 360p
    .on("end", () => {
        res.status(200).send("Video processing finished successfully.")
    })
    .on("error", (err) => {
        console.log(`An error occured: ${err.message}`);
        res.status(500).send(`500 Internal Server Error: ${err.message}`);
    })
    .save(outputFilePath);
}