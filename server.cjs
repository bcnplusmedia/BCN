var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_axios = __toESM(require("axios"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use((0, import_cors.default)());
app.use(import_express.default.json());
var GDRIVE_API_KEY = process.env.GDRIVE_API_KEY || "AIzaSyCGmWZUA8yp6u5GcCJrAFE7sTujJzq68W0";
var ROOT_FOLDER_ID = process.env.DRIVE_FOLDER_ID || "1nyoc0L2BrItWDmTpSE1PDLzQPB-V1Y42";
var mediaCache = null;
var lastFetchTime = 0;
var CACHE_TTL = 10 * 60 * 1e3;
var ai = new import_genai.GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
app.post("/api/chat", async (req, res) => {
  try {
    const { prompt } = req.body;
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        // @ts-ignore
        thinkingConfig: {
          thinkingBudget: 1024,
          thinkingLevel: "HIGH"
        }
      }
    });
    res.json({ text: response.text });
  } catch (error) {
    console.error("AI error", error);
    res.status(500).json({ error: "AI generation failed" });
  }
});
var COMMENTS_FILE = import_path.default.join(process.cwd(), "comments-store.json");
function readLocalComments(fileId) {
  try {
    if (!import_fs.default.existsSync(COMMENTS_FILE)) {
      return [];
    }
    const fileContent = import_fs.default.readFileSync(COMMENTS_FILE, "utf-8");
    if (!fileContent.trim()) return [];
    const data = JSON.parse(fileContent);
    return data[fileId] || [];
  } catch (e) {
    console.error("Error reading local comments", e);
    return [];
  }
}
function saveLocalComment(fileId, comment) {
  try {
    let data = {};
    if (import_fs.default.existsSync(COMMENTS_FILE)) {
      const fileContent = import_fs.default.readFileSync(COMMENTS_FILE, "utf-8");
      if (fileContent.trim()) {
        data = JSON.parse(fileContent);
      }
    }
    if (!data[fileId]) {
      data[fileId] = [];
    }
    data[fileId].unshift(comment);
    import_fs.default.writeFileSync(COMMENTS_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("Error saving local comment", e);
  }
}
function parseEpisodeNumber(title) {
  const numMatch = title.match(/\b(\d+)\b/);
  if (numMatch) {
    return parseInt(numMatch[1], 10);
  }
  const titleNormalized = title.replace(/[أإآا]/g, "\u0627").replace(/ة/g, "\u0647").trim();
  const ordinals = {
    "\u0627\u0644\u0627\u0648\u0644\u0649": 1,
    "\u0627\u0644\u0627\u0648\u0644": 1,
    "\u0627\u0644\u062B\u0627\u0646\u064A\u0647": 2,
    "\u0627\u0644\u062B\u0627\u0646\u064A": 2,
    "\u0627\u0644\u062B\u0627\u0644\u062B\u0647": 3,
    "\u0627\u0644\u062B\u0627\u0644\u062B": 3,
    "\u0627\u0644\u0631\u0627\u0628\u0639\u0647": 4,
    "\u0627\u0644\u0631\u0627\u0628\u0639": 4,
    "\u0627\u0644\u062E\u0627\u0645\u0633\u0647": 5,
    "\u0627\u0644\u062E\u0627\u0645\u0633": 5,
    "\u0627\u0644\u0633\u0627\u062F\u0633\u0647": 6,
    "\u0627\u0644\u0633\u0627\u062F\u0633": 6,
    "\u0627\u0644\u0633\u0627\u0628\u0639\u0647": 7,
    "\u0627\u0644\u0633\u0627\u0628\u0639": 7,
    "\u0627\u0644\u062B\u0627\u0645\u0646\u0647": 8,
    "\u0627\u0644\u062B\u0627\u0645\u0646": 8,
    "\u0627\u0644\u062A\u0627\u0633\u0639\u0647": 9,
    "\u0627\u0644\u062A\u0627\u0633\u0639": 9,
    "\u0627\u0644\u0639\u0627\u0634\u0631\u0647": 10,
    "\u0627\u0644\u0639\u0627\u0634\u0631": 10,
    "\u0627\u0644\u062D\u0627\u062F\u064A\u0647 \u0639\u0634\u0631": 11,
    "\u0627\u0644\u062D\u0627\u062F\u064A \u0639\u0634\u0631": 11,
    "\u0627\u0644\u062B\u0627\u0646\u064A\u0647 \u0639\u0634\u0631": 12,
    "\u0627\u0644\u062B\u0627\u0646\u064A \u0639\u0634\u0631": 12,
    "\u0627\u0644\u062B\u0627\u0644\u062B\u0647 \u0639\u0634\u0631": 13,
    "\u0627\u0644\u062B\u0627\u0644\u062B \u0639\u0634\u0631": 13,
    "\u0627\u0644\u0631\u0627\u0628\u0639\u0647 \u0639\u0634\u0631": 14,
    "\u0627\u0644\u0631\u0627\u0628\u0639 \u0639\u0634\u0631": 14,
    "\u0627\u0644\u062E\u0627\u0645\u0633\u0647 \u0639\u0634\u0631": 15,
    "\u0627\u0644\u062E\u0627\u0645\u0633 \u0639\u0634\u0631": 15,
    "\u0627\u0644\u0633\u0627\u062F\u0633\u0647 \u0639\u0634\u0631": 16,
    "\u0627\u0644\u0633\u0627\u062F\u0633 \u0639\u0634\u0631": 16,
    "\u0627\u0644\u0633\u0627\u0628\u0639\u0647 \u0639\u0634\u0631": 17,
    "\u0627\u0644\u0633\u0627\u0628\u0639 \u0639\u0634\u0631": 17,
    "\u0627\u0644\u062B\u0627\u0645\u0646\u0647 \u0639\u0634\u0631": 18,
    "\u0627\u0644\u062B\u0627\u0645\u0646 \u0639\u0634\u0631": 18,
    "\u0627\u0644\u062A\u0627\u0633\u0639\u0647 \u0639\u0634\u0631": 19,
    "\u0627\u0644\u062A\u0627\u0633\u0639 \u0639\u0634\u0631": 19,
    "\u0627\u0644\u0639\u0634\u0631\u0648\u0646": 20,
    "\u0627\u0644\u0639\u0634\u0631\u064A\u0646": 20
  };
  for (const key of Object.keys(ordinals)) {
    const normKey = key.replace(/[أإآا]/g, "\u0627").replace(/ة/g, "\u0647");
    if (titleNormalized.includes(normKey)) {
      return ordinals[key];
    }
  }
  return 999;
}
app.get("/api/comments/:fileId", async (req, res) => {
  const { fileId } = req.params;
  try {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}/comments?key=${GDRIVE_API_KEY}&fields=comments(id,content,author(displayName,photoLink),createdTime,resolved,replies(id,content,author(displayName,photoLink),createdTime))`;
    const driveRes = await import_axios.default.get(url);
    const driveComments = driveRes.data.comments || [];
    const mappedDrive = driveComments.map((c) => ({
      id: c.id,
      content: c.content,
      author: {
        displayName: c.author?.displayName || "\u0645\u0633\u062A\u062E\u062F\u0645 Google Drive",
        photoLink: c.author?.photoLink || ""
      },
      createdTime: c.createdTime,
      resolved: c.resolved || false,
      replies: (c.replies || []).map((r) => ({
        id: r.id,
        content: r.content,
        author: {
          displayName: r.author?.displayName || "\u0645\u0633\u062A\u062E\u062F\u0645 Google Drive",
          photoLink: r.author?.photoLink || ""
        },
        createdTime: r.createdTime
      }))
    }));
    const localComments = readLocalComments(fileId);
    const mergedMap = /* @__PURE__ */ new Map();
    localComments.forEach((c) => {
      mergedMap.set(c.id, {
        id: c.id,
        content: c.content,
        author: c.author,
        createdTime: c.createdTime,
        resolved: c.resolved || false,
        replies: c.replies || []
      });
    });
    mappedDrive.forEach((c) => {
      const existing = mergedMap.get(c.id);
      const mergedReplies = [...c.replies || []];
      if (existing && existing.replies) {
        existing.replies.forEach((lr) => {
          if (lr.id.startsWith("local_reply_") && !mergedReplies.some((dr) => dr.content === lr.content)) {
            mergedReplies.push(lr);
          }
        });
      }
      mergedMap.set(c.id, {
        id: c.id,
        content: c.content,
        author: c.author,
        createdTime: c.createdTime,
        resolved: c.resolved || false,
        replies: mergedReplies
      });
    });
    const merged = Array.from(mergedMap.values());
    merged.sort((a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime());
    return res.json({ comments: merged });
  } catch (error) {
    const localComments = readLocalComments(fileId);
    return res.json({ comments: localComments });
  }
});
app.post("/api/comments/:fileId", async (req, res) => {
  const { fileId } = req.params;
  const { content, authorName } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: "Comment content is required" });
  }
  const newComment = {
    id: "local_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
    content: content.trim(),
    author: {
      displayName: authorName || "\u0645\u0633\u062A\u062E\u062F\u0645 BCN+",
      photoLink: ""
    },
    createdTime: (/* @__PURE__ */ new Date()).toISOString(),
    resolved: false,
    replies: []
  };
  saveLocalComment(fileId, newComment);
  try {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}/comments?key=${GDRIVE_API_KEY}`;
    await import_axios.default.post(url, { content: content.trim() });
  } catch (err) {
  }
  return res.json({ success: true, comment: newComment });
});
app.post("/api/comments/:fileId/:commentId/replies", async (req, res) => {
  const { fileId, commentId } = req.params;
  const { content, authorName } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: "Reply content is required" });
  }
  const newReply = {
    id: "local_reply_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
    content: content.trim(),
    author: {
      displayName: authorName || "\u0645\u0633\u062A\u062E\u062F\u0645 BCN+",
      photoLink: ""
    },
    createdTime: (/* @__PURE__ */ new Date()).toISOString()
  };
  try {
    let data = {};
    if (import_fs.default.existsSync(COMMENTS_FILE)) {
      const fileContent = import_fs.default.readFileSync(COMMENTS_FILE, "utf-8");
      if (fileContent.trim()) {
        data = JSON.parse(fileContent);
      }
    }
    const commentsList = data[fileId] || [];
    const parentComment = commentsList.find((c) => c.id === commentId);
    if (parentComment) {
      if (!parentComment.replies) parentComment.replies = [];
      parentComment.replies.push(newReply);
    } else {
      const placeholderParent = {
        id: commentId,
        content: "\u062A\u0639\u0644\u064A\u0642 Google Drive",
        author: { displayName: "\u0645\u0633\u062A\u062E\u062F\u0645 Google Drive", photoLink: "" },
        createdTime: (/* @__PURE__ */ new Date()).toISOString(),
        resolved: false,
        replies: [newReply]
      };
      commentsList.push(placeholderParent);
      data[fileId] = commentsList;
    }
    import_fs.default.writeFileSync(COMMENTS_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("Error saving local reply", e);
  }
  try {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}/comments/${commentId}/replies?key=${GDRIVE_API_KEY}`;
    await import_axios.default.post(url, { content: content.trim() });
  } catch (err) {
  }
  return res.json({ success: true, reply: newReply });
});
async function getDriveFiles(query) {
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&key=${GDRIVE_API_KEY}&fields=files(id,name,mimeType,parents,thumbnailLink,size,videoMediaMetadata,description)&pageSize=1000`;
  const response = await import_axios.default.get(url);
  return response.data.files;
}
async function getDriveFileContent(fileId) {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${GDRIVE_API_KEY}`;
  try {
    const response = await import_axios.default.get(url);
    return response.data;
  } catch (e) {
    return null;
  }
}
async function scanLibrary() {
  console.log("Scanning Drive Library...");
  const rootChildren = await getDriveFiles(`'${ROOT_FOLDER_ID}' in parents and trashed = false`);
  let library = {
    movies: [],
    series: [],
    kids: [],
    documentary: [],
    islamic: []
  };
  const getDirectLink = (id) => `/api/video/${id}`;
  const getImageLink = (id) => `/api/image/${id}`;
  for (const category of rootChildren) {
    if (category.mimeType !== "application/vnd.google-apps.folder") continue;
    let catName = category.name.toLowerCase();
    let targetList = [];
    if (catName.includes("movies") || catName.includes("\u0627\u0641\u0644\u0627\u0645")) targetList = library.movies;
    else if (catName.includes("series") || catName.includes("\u0645\u0633\u0644\u0633\u0644\u0627\u062A")) targetList = library.series;
    else if (catName.includes("kids") || catName.includes("\u0627\u0637\u0641\u0627\u0644")) targetList = library.kids;
    else if (catName.includes("documentary") || catName.includes("\u0648\u062B\u0627\u0626\u0642\u064A")) targetList = library.documentary;
    else if (catName.includes("religious") || catName.includes("islamic") || catName.includes("\u0625\u0633\u0644\u0627\u0645\u064A") || catName.includes("\u0627\u0633\u0644\u0627\u0645\u064A")) targetList = library.islamic;
    const items = await getDriveFiles(`'${category.id}' in parents and trashed = false`);
    for (const itemFolder of items) {
      if (itemFolder.mimeType !== "application/vnd.google-apps.folder") continue;
      const files = await getDriveFiles(`'${itemFolder.id}' in parents and trashed = false`);
      let coverUrl = "";
      let videoUrl = "";
      let trailerUrl = "";
      let videoSize = "";
      let videoId = "";
      let trailerId = "";
      let videoDuration;
      let info = {};
      let videoThumbnail = "";
      let fallbackVideoUrl = "";
      let fallbackVideoId = "";
      let fallbackVideoSize = "";
      let fallbackVideoDuration;
      for (const file of files) {
        if (file.name.toLowerCase().includes("cover") && file.mimeType.startsWith("image/")) {
          coverUrl = file.thumbnailLink ? file.thumbnailLink.replace("=s220", "=s800") : getImageLink(file.id);
        } else if (file.name.toLowerCase().includes("info.json")) {
          const content = await getDriveFileContent(file.id);
          if (content) info = content;
        } else if (file.mimeType.startsWith("video/")) {
          if (file.name.toLowerCase().includes("trailer")) {
            trailerUrl = getDirectLink(file.id);
            trailerId = file.id;
          } else {
            const expectedName = (itemFolder.name + ".mp4").toLowerCase();
            if (file.name.toLowerCase() === expectedName) {
              videoUrl = getDirectLink(file.id);
              videoId = file.id;
              videoSize = file.size || "";
              videoDuration = file.videoMediaMetadata?.durationMillis ? parseInt(file.videoMediaMetadata.durationMillis) / 1e3 : void 0;
              videoThumbnail = file.thumbnailLink || "";
            } else {
              fallbackVideoUrl = getDirectLink(file.id);
              fallbackVideoId = file.id;
              fallbackVideoSize = file.size || "";
              fallbackVideoDuration = file.videoMediaMetadata?.durationMillis ? parseInt(file.videoMediaMetadata.durationMillis) / 1e3 : void 0;
              if (!videoThumbnail) {
                videoThumbnail = file.thumbnailLink || "";
              }
            }
          }
        } else if (file.mimeType === "application/vnd.google-apps.folder" && file.name.toLowerCase() === "trailer") {
          const trailerFiles = await getDriveFiles(`'${file.id}' in parents and trashed = false`);
          const trailerVideo = trailerFiles.find((f) => f.mimeType.startsWith("video/"));
          if (trailerVideo) {
            trailerUrl = getDirectLink(trailerVideo.id);
            trailerId = trailerVideo.id;
          }
        }
      }
      if (!videoUrl) {
        videoUrl = fallbackVideoUrl;
        videoId = fallbackVideoId;
        videoSize = fallbackVideoSize;
        videoDuration = fallbackVideoDuration;
      }
      let seasons = [];
      const isSeries = catName.includes("series") || catName.includes("\u0645\u0633\u0644\u0633\u0644\u0627\u062A");
      if (isSeries) {
        const seasonFolders = files.filter((f) => f.mimeType === "application/vnd.google-apps.folder" && f.name.toLowerCase() !== "trailer");
        if (seasonFolders.length > 0) {
          seasonFolders.sort((a, b) => a.name.localeCompare(b.name, void 0, { numeric: true, sensitivity: "base" }));
          for (const sf of seasonFolders) {
            try {
              const epFiles = await getDriveFiles(`'${sf.id}' in parents and trashed = false`);
              const seasonEpisodes = [];
              let seasonCover = "";
              let seasonInfo = {};
              for (const epFile of epFiles) {
                if (epFile.name.toLowerCase().includes("cover") && epFile.mimeType.startsWith("image/")) {
                  seasonCover = epFile.thumbnailLink ? epFile.thumbnailLink.replace("=s220", "=s800") : getImageLink(epFile.id);
                } else if (epFile.name.toLowerCase().includes("info.json")) {
                  const content = await getDriveFileContent(epFile.id);
                  if (content) seasonInfo = content;
                } else if (epFile.mimeType.startsWith("video/")) {
                  let titleStr = epFile.name;
                  let epRating = void 0;
                  const extMatch = epFile.name.match(/\.([a-zA-Z0-9]+)$/);
                  if (extMatch) {
                    const ext = extMatch[1].toLowerCase();
                    if (isNaN(Number(ext)) && ext.length >= 2 && ext.length <= 5) {
                      titleStr = epFile.name.substring(0, epFile.name.lastIndexOf("."));
                    }
                  }
                  const ratingMatch = titleStr.match(/^(.*?)\s*[-–—]\s*([0-9]+(?:\.[0-9]+)?)$/);
                  if (ratingMatch) {
                    titleStr = ratingMatch[1].trim();
                    epRating = parseFloat(ratingMatch[2]);
                  } else {
                    titleStr = titleStr.replace(/\.[^/.]+$/, "");
                  }
                  let epYear = void 0;
                  if (epFile.description) {
                    try {
                      const descObj = JSON.parse(epFile.description);
                      if (descObj.year) epYear = String(descObj.year);
                      if (descObj.rating && epRating === void 0) epRating = Number(descObj.rating);
                    } catch (e) {
                      const yMatch = epFile.description.match(/\b(19\d\d|20\d\d)\b/);
                      if (yMatch) epYear = yMatch[1];
                      if (epRating === void 0) {
                        const rMatch = epFile.description.match(/\b([0-9](\.[0-9])?|10(\.0)?)\b/);
                        if (rMatch) epRating = Number(rMatch[1]);
                      }
                    }
                  }
                  if (!epYear) {
                    const yMatch = titleStr.match(/(?:^|\s|\(|\[)(19\d\d|20\d\d)(?:\s|\)|\]|$)/);
                    if (yMatch) epYear = yMatch[1];
                  }
                  if (!epRating) {
                    const rMatch = titleStr.match(/(?:^|\s|\(|\[)([0-9](\.[0-9])?|10(\.0)?)(?:\s|\)|\]|$)/);
                    if (rMatch) epRating = Number(rMatch[1]);
                  }
                  seasonEpisodes.push({
                    id: epFile.id,
                    title: titleStr,
                    video: getDirectLink(epFile.id),
                    size: epFile.size || "",
                    thumbnail: epFile.thumbnailLink || "",
                    duration: epFile.videoMediaMetadata?.durationMillis ? parseInt(epFile.videoMediaMetadata.durationMillis) / 1e3 : void 0,
                    year: epYear,
                    rating: epRating
                  });
                }
              }
              seasonEpisodes.sort((a, b) => {
                const numA = parseEpisodeNumber(a.title);
                const numB = parseEpisodeNumber(b.title);
                if (numA !== numB) return numA - numB;
                return a.title.localeCompare(b.title, void 0, { numeric: true, sensitivity: "base" });
              });
              seasonEpisodes.forEach((ep) => {
                if (seasonInfo.rating && !ep.rating) ep.rating = seasonInfo.rating;
                if (seasonInfo.year && !ep.year) ep.year = seasonInfo.year;
              });
              seasons.push({
                id: sf.id,
                name: sf.name,
                cover: seasonCover,
                episodes: seasonEpisodes
              });
            } catch (err) {
              console.error(`Error scanning episodes for season ${sf.name}`, err);
            }
          }
        } else {
          const directEpisodes = files.filter((f) => f.mimeType.startsWith("video/") && !f.name.toLowerCase().includes("trailer"));
          if (directEpisodes.length > 0) {
            const seasonEpisodes = directEpisodes.map((f) => {
              let titleStr = f.name;
              let epRating = void 0;
              const extMatch = f.name.match(/\.([a-zA-Z0-9]+)$/);
              if (extMatch) {
                const ext = extMatch[1].toLowerCase();
                if (isNaN(Number(ext)) && ext.length >= 2 && ext.length <= 5) {
                  titleStr = f.name.substring(0, f.name.lastIndexOf("."));
                }
              }
              const ratingMatch = titleStr.match(/^(.*?)\s*[-–—]\s*([0-9]+(?:\.[0-9]+)?)$/);
              if (ratingMatch) {
                titleStr = ratingMatch[1].trim();
                epRating = parseFloat(ratingMatch[2]);
              } else {
                titleStr = titleStr.replace(/\.[^/.]+$/, "");
              }
              let epYear = void 0;
              if (f.description) {
                try {
                  const descObj = JSON.parse(f.description);
                  if (descObj.year) epYear = String(descObj.year);
                  if (descObj.rating && epRating === void 0) epRating = Number(descObj.rating);
                } catch (e) {
                  const yMatch = f.description.match(/\b(19\d\d|20\d\d)\b/);
                  if (yMatch) epYear = yMatch[1];
                  if (epRating === void 0) {
                    const rMatch = f.description.match(/\b([0-9](\.[0-9])?|10(\.0)?)\b/);
                    if (rMatch) epRating = Number(rMatch[1]);
                  }
                }
              }
              if (!epYear) {
                const yMatch = titleStr.match(/(?:^|\s|\(|\[)(19\d\d|20\d\d)(?:\s|\)|\]|$)/);
                if (yMatch) epYear = yMatch[1];
              }
              if (!epRating) {
                const rMatch = titleStr.match(/(?:^|\s|\(|\[)([0-9](\.[0-9])?|10(\.0)?)(?:\s|\)|\]|$)/);
                if (rMatch) epRating = Number(rMatch[1]);
              }
              return {
                id: f.id,
                title: titleStr,
                video: getDirectLink(f.id),
                size: f.size || "",
                thumbnail: f.thumbnailLink || "",
                duration: f.videoMediaMetadata?.durationMillis ? parseInt(f.videoMediaMetadata.durationMillis) / 1e3 : void 0,
                year: epYear || info.year,
                rating: epRating || info.rating
              };
            });
            seasonEpisodes.sort((a, b) => {
              const numA = parseEpisodeNumber(a.title);
              const numB = parseEpisodeNumber(b.title);
              if (numA !== numB) return numA - numB;
              return a.title.localeCompare(b.title, void 0, { numeric: true, sensitivity: "base" });
            });
            seasons.push({
              id: itemFolder.id,
              name: "\u0627\u0644\u0645\u0648\u0633\u0645 1",
              episodes: seasonEpisodes
            });
          }
        }
        if (seasons.length > 0 && seasons[0].episodes.length > 0) {
          videoUrl = seasons[0].episodes[0].video;
          videoId = seasons[0].episodes[0].id;
          videoSize = seasons[0].episodes[0].size || "";
          videoDuration = seasons[0].episodes[0].duration;
        }
      }
      targetList.push({
        id: itemFolder.id,
        title: itemFolder.name,
        cover: coverUrl,
        video: videoUrl,
        videoId,
        thumbnail: videoThumbnail,
        trailer: info.trailer || info.trailer_url || trailerUrl,
        trailerId,
        size: videoSize,
        duration: videoDuration,
        info,
        seasons: seasons.length > 0 ? seasons : void 0
      });
    }
  }
  mediaCache = library;
  lastFetchTime = Date.now();
  console.log("Library scanned successfully.");
  return library;
}
app.get("/api/library", async (req, res) => {
  try {
    if (mediaCache && Date.now() - lastFetchTime < CACHE_TTL) {
      return res.json(mediaCache);
    }
    const library = await scanLibrary();
    res.json(library);
  } catch (error) {
    console.error("Library fetch error", error?.response?.data || error);
    res.status(500).json({ error: "Failed to fetch library" });
  }
});
app.get("/api/image/:id", async (req, res) => {
  const { id } = req.params;
  const url = `https://www.googleapis.com/drive/v3/files/${id}?alt=media&key=${GDRIVE_API_KEY}`;
  try {
    const response = await import_axios.default.get(url, { responseType: "stream" });
    if (response.headers["content-type"]) res.setHeader("Content-Type", response.headers["content-type"]);
    if (response.headers["content-length"]) res.setHeader("Content-Length", response.headers["content-length"]);
    response.data.pipe(res);
  } catch (error) {
    console.error(`Error fetching image ${id}`);
    res.status(500).send("Error fetching image");
  }
});
app.get("/api/video/:id", async (req, res) => {
  const { id } = req.params;
  const range = req.headers.range;
  const url = `https://www.googleapis.com/drive/v3/files/${id}?alt=media&key=${GDRIVE_API_KEY}`;
  const headers = {};
  if (range) {
    headers["Range"] = range;
  }
  try {
    const response = await (0, import_axios.default)({
      method: "get",
      url,
      headers,
      responseType: "stream",
      validateStatus: (status) => status >= 200 && status < 300
    });
    const contentType = response.headers["content-type"];
    const contentLength = response.headers["content-length"];
    const contentRange = response.headers["content-range"];
    const acceptRanges = response.headers["accept-ranges"] || "bytes";
    if (contentType) res.setHeader("Content-Type", contentType);
    if (contentLength) res.setHeader("Content-Length", contentLength);
    if (contentRange) res.setHeader("Content-Range", contentRange);
    res.setHeader("Accept-Ranges", acceptRanges);
    res.status(response.status);
    req.on("close", () => {
      response.data.destroy();
    });
    response.data.pipe(res);
  } catch (error) {
    console.error(`Error streaming video ${id}:`, error?.message);
    res.status(500).send("Error streaming video");
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
