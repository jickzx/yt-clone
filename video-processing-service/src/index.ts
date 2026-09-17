import express from "express";
import { randomUUID } from "node:crypto";
import path from "node:path";
import {
  convertVideo,
  deleteProcessedVideo,
  deleteRawVideo,
  downloadRawVideo,
  rawVideoBucketName,
  setupDirectories,
  uploadProcessedVideo,
} from "./storage";

const app = express();
app.use(express.json({ limit: "16kb" }));

const port = Number(process.env.PORT ?? 3000);
const processingWebhookSecret = process.env.PROCESSING_WEBHOOK_SECRET;

if (!processingWebhookSecret) {
  throw new Error("PROCESSING_WEBHOOK_SECRET must be configured.");
}

type ProcessVideoBody = {
  name?: unknown;
  record?: {
    name?: unknown;
    bucket_id?: unknown;
  };
};

app.post("/process-video", async (req, res) => {
  if (req.get("x-processing-secret") !== processingWebhookSecret) {
    return res.status(401).send("Unauthorized");
  }

  const body = req.body as ProcessVideoBody;
  const inputObjectName = body.record?.name ?? body.name;
  const sourceBucket = body.record?.bucket_id;

  if (
    typeof inputObjectName !== "string" ||
    !isSafeStorageObjectName(inputObjectName)
  ) {
    return res.status(400).send("Bad request: invalid video object name.");
  }

  // Supabase Database Webhooks include bucket_id. Direct calls can send { name }.
  if (sourceBucket !== undefined && sourceBucket !== rawVideoBucketName) {
    return res.status(202).send("Ignored event from a different bucket.");
  }

  const parsedInputPath = path.posix.parse(inputObjectName);
  const outputObjectName = path.posix.join(
    parsedInputPath.dir,
    `processed-${parsedInputPath.name}.mp4`
  );

  const jobId = randomUUID();
  const localInputFileName = `${jobId}${parsedInputPath.ext || ".video"}`;
  const localOutputFileName = `${jobId}.mp4`;

  try {
    await downloadRawVideo(inputObjectName, localInputFileName);
    await convertVideo(localInputFileName, localOutputFileName);
    await uploadProcessedVideo(outputObjectName, localOutputFileName);

    return res.status(200).json({
      message: "Processing finished successfully.",
      inputObjectName,
      outputObjectName,
    });
  } catch (error) {
    console.error("Video processing failed:", error);
    return res.status(500).send("Video processing failed.");
  } finally {
    await Promise.allSettled([
      deleteRawVideo(localInputFileName),
      deleteProcessedVideo(localOutputFileName),
    ]);
  }
});

function isSafeStorageObjectName(objectName: string): boolean {
  if (
    objectName.length === 0 ||
    objectName.startsWith("/") ||
    objectName.includes("\\") ||
    objectName.includes("\0")
  ) {
    return false;
  }

  return objectName.split("/").every((segment) => {
    return segment.length > 0 && segment !== "." && segment !== "..";
  });
}

async function startServer(): Promise<void> {
  await setupDirectories();

  app.listen(port, () => {
    console.log(`Video Processing Service listening on port ${port}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start Video Processing Service:", error);
  process.exit(1);
});
