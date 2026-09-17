"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const node_crypto_1 = require("node:crypto");
const node_path_1 = __importDefault(require("node:path"));
const storage_1 = require("./storage");
const app = (0, express_1.default)();
app.use(express_1.default.json({ limit: "16kb" }));
const port = Number((_a = process.env.PORT) !== null && _a !== void 0 ? _a : 3000);
const processingWebhookSecret = process.env.PROCESSING_WEBHOOK_SECRET;
if (!processingWebhookSecret) {
    throw new Error("PROCESSING_WEBHOOK_SECRET must be configured.");
}
app.post("/process-video", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    if (req.get("x-processing-secret") !== processingWebhookSecret) {
        return res.status(401).send("Unauthorized");
    }
    const body = req.body;
    const inputObjectName = (_b = (_a = body.record) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : body.name;
    const sourceBucket = (_c = body.record) === null || _c === void 0 ? void 0 : _c.bucket_id;
    if (typeof inputObjectName !== "string" ||
        !isSafeStorageObjectName(inputObjectName)) {
        return res.status(400).send("Bad request: invalid video object name.");
    }
    // Supabase Database Webhooks include bucket_id. Direct calls can send { name }.
    if (sourceBucket !== undefined && sourceBucket !== storage_1.rawVideoBucketName) {
        return res.status(202).send("Ignored event from a different bucket.");
    }
    const parsedInputPath = node_path_1.default.posix.parse(inputObjectName);
    const outputObjectName = node_path_1.default.posix.join(parsedInputPath.dir, `processed-${parsedInputPath.name}.mp4`);
    const jobId = (0, node_crypto_1.randomUUID)();
    const localInputFileName = `${jobId}${parsedInputPath.ext || ".video"}`;
    const localOutputFileName = `${jobId}.mp4`;
    try {
        yield (0, storage_1.downloadRawVideo)(inputObjectName, localInputFileName);
        yield (0, storage_1.convertVideo)(localInputFileName, localOutputFileName);
        yield (0, storage_1.uploadProcessedVideo)(outputObjectName, localOutputFileName);
        return res.status(200).json({
            message: "Processing finished successfully.",
            inputObjectName,
            outputObjectName,
        });
    }
    catch (error) {
        console.error("Video processing failed:", error);
        return res.status(500).send("Video processing failed.");
    }
    finally {
        yield Promise.allSettled([
            (0, storage_1.deleteRawVideo)(localInputFileName),
            (0, storage_1.deleteProcessedVideo)(localOutputFileName),
        ]);
    }
}));
function isSafeStorageObjectName(objectName) {
    if (objectName.length === 0 ||
        objectName.startsWith("/") ||
        objectName.includes("\\") ||
        objectName.includes("\0")) {
        return false;
    }
    return objectName.split("/").every((segment) => {
        return segment.length > 0 && segment !== "." && segment !== "..";
    });
}
function startServer() {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, storage_1.setupDirectories)();
        app.listen(port, () => {
            console.log(`Video Processing Service listening on port ${port}`);
        });
    });
}
startServer().catch((error) => {
    console.error("Failed to start Video Processing Service:", error);
    process.exit(1);
});
