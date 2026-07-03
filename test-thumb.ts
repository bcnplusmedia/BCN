import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();
const key = process.env.GDRIVE_API_KEY || 'AIzaSyCGmWZUA8yp6u5GcCJrAFE7sTujJzq68W0';
async function test() {
  const rootChildren = await axios.get(`https://www.googleapis.com/drive/v3/files?q='1nyoc0L2BrItWDmTpSE1PDLzQPB-V1Y42'+in+parents+and+trashed%3Dfalse&key=${key}&fields=files(id,name,mimeType)`);
  const cat = rootChildren.data.files.find(f => f.name.toLowerCase().includes('movies') || f.name.includes('افلام')) || rootChildren.data.files[0];
  if(cat) {
    const items = await axios.get(`https://www.googleapis.com/drive/v3/files?q='${cat.id}'+in+parents+and+trashed%3Dfalse&key=${key}&fields=files(id,name,mimeType)`);
    if(items.data.files[0]) {
       const files = await axios.get(`https://www.googleapis.com/drive/v3/files?q='${items.data.files[0].id}'+in+parents+and+trashed%3Dfalse&key=${key}&fields=files(id,name,mimeType,thumbnailLink,webContentLink)`);
       const img = files.data.files.find(f => f.mimeType.startsWith('image'));
       if (img) {
         console.log('Image details:', img);
       }
    }
  }
}
test();
