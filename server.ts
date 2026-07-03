import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const GDRIVE_API_KEY = process.env.GDRIVE_API_KEY || 'AIzaSyCGmWZUA8yp6u5GcCJrAFE7sTujJzq68W0';
const ROOT_FOLDER_ID = process.env.DRIVE_FOLDER_ID || '1nyoc0L2BrItWDmTpSE1PDLzQPB-V1Y42';

// Caching to prevent hitting API limits
let mediaCache: any = null;
let lastFetchTime = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/api/chat', async (req, res) => {
  try {
    const { prompt } = req.body;
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
      config: {
        // @ts-ignore
        thinkingConfig: {
          thinkingBudget: 1024,
          thinkingLevel: 'HIGH' as any,
        },
      }
    });
    res.json({ text: response.text });
  } catch (error: any) {
    console.error("AI error", error);
    res.status(500).json({ error: 'AI generation failed' });
  }
});

async function getDriveFiles(query: string) {
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&key=${GDRIVE_API_KEY}&fields=files(id,name,mimeType,parents,thumbnailLink,size)&pageSize=1000`;
  const response = await axios.get(url);
  return response.data.files;
}

// Function to fetch info.json content
async function getDriveFileContent(fileId: string) {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${GDRIVE_API_KEY}`;
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (e) {
    return null;
  }
}

async function scanLibrary() {
  console.log("Scanning Drive Library...");
  
  // We'll do a flat query for all files and folders that are descendants?
  // Drive API doesn't support deep descendant queries easily.
  // Instead, let's just fetch everything in the drive and build the tree if it's a dedicated folder,
  // BUT without a service account we can only search files we have access to. 
  // Let's use a simpler approach: get children of root, then children of those...
  
  const rootChildren = await getDriveFiles(`'${ROOT_FOLDER_ID}' in parents and trashed = false`);
  
  let library: any = {
    movies: [],
    series: [],
    kids: [],
    documentary: [],
    islamic: []
  };

  const getDirectLink = (id: string) => `https://www.googleapis.com/drive/v3/files/${id}?alt=media&key=${GDRIVE_API_KEY}`;
  const getImageLink = (id: string) => `/api/image/${id}`;

  for (const category of rootChildren) {
    if (category.mimeType !== 'application/vnd.google-apps.folder') continue;
    
    let catName = category.name.toLowerCase();
    let targetList: any[] = [];
    
    if (catName.includes('movies') || catName.includes('افلام')) targetList = library.movies;
    else if (catName.includes('series') || catName.includes('مسلسلات')) targetList = library.series;
    else if (catName.includes('kids') || catName.includes('اطفال')) targetList = library.kids;
    else if (catName.includes('documentary') || catName.includes('وثائقي')) targetList = library.documentary;
    else if (catName.includes('religious') || catName.includes('إسلامي')) targetList = library.islamic;

    const items = await getDriveFiles(`'${category.id}' in parents and trashed = false`);
    
    for (const itemFolder of items) {
      if (itemFolder.mimeType !== 'application/vnd.google-apps.folder') continue;
      
      const files = await getDriveFiles(`'${itemFolder.id}' in parents and trashed = false`);
      
      let coverUrl = '';
      let videoUrl = '';
      let trailerUrl = '';
      let videoSize = '';
      let videoId = '';
      let trailerId = '';
      let info = {};
      
      for (const file of files) {
        if (file.name.toLowerCase().includes('cover') && file.mimeType.startsWith('image/')) {
          coverUrl = file.thumbnailLink ? file.thumbnailLink.replace('=s220', '=s800') : getImageLink(file.id);
        } else if (file.name.toLowerCase().includes('info.json')) {
          const content = await getDriveFileContent(file.id);
          if (content) info = content;
        } else if (file.mimeType.startsWith('video/')) {
          videoUrl = getDirectLink(file.id);
          videoId = file.id;
          videoSize = file.size || '';
        } else if (file.mimeType === 'application/vnd.google-apps.folder' && file.name.toLowerCase() === 'trailer') {
           const trailerFiles = await getDriveFiles(`'${file.id}' in parents and trashed = false`);
           const trailerVideo = trailerFiles.find((f: any) => f.mimeType.startsWith('video/'));
           if (trailerVideo) {
             trailerUrl = getDirectLink(trailerVideo.id);
             trailerId = trailerVideo.id;
           }
        }
      }
      
      // We might have multiple seasons for series, but let's keep it simple for now
      targetList.push({
        id: itemFolder.id,
        title: itemFolder.name,
        cover: coverUrl,
        video: videoUrl,
        videoId: videoId,
        trailer: trailerUrl,
        trailerId: trailerId,
        size: videoSize,
        info: info
      });
    }
  }
  
  mediaCache = library;
  lastFetchTime = Date.now();
  console.log("Library scanned successfully.");
  return library;
}

app.get('/api/library', async (req, res) => {
  try {
    if (mediaCache && (Date.now() - lastFetchTime < CACHE_TTL)) {
      return res.json(mediaCache);
    }
    const library = await scanLibrary();
    res.json(library);
  } catch (error: any) {
    console.error("Library fetch error", error?.response?.data || error);
    res.status(500).json({ error: 'Failed to fetch library' });
  }
});

app.get('/api/image/:id', async (req, res) => {
  const { id } = req.params;
  const url = `https://www.googleapis.com/drive/v3/files/${id}?alt=media&key=${GDRIVE_API_KEY}`;
  try {
    const response = await axios.get(url, { responseType: 'stream' });
    if (response.headers['content-type']) res.setHeader('Content-Type', response.headers['content-type'] as string);
    if (response.headers['content-length']) res.setHeader('Content-Length', response.headers['content-length'] as string);
    // Pipe the image stream directly to the response
    response.data.pipe(res);
  } catch (error) {
    console.error(`Error fetching image ${id}`);
    res.status(500).send('Error fetching image');
  }
});

// Vite Middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
