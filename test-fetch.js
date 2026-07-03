const axios = require('axios');
require('dotenv').config();
const key = process.env.GDRIVE_API_KEY || 'AIzaSyCGmWZUA8yp6u5GcCJrAFE7sTujJzq68W0';
const id = '12345'; // replace with real ID if possible
async function test() {
  // Let's just find an image file id
  const rootChildren = await axios.get(`https://www.googleapis.com/drive/v3/files?q='1nyoc0L2BrItWDmTpSE1PDLzQPB-V1Y42'+in+parents+and+trashed%3Dfalse&key=${key}&fields=files(id,name,mimeType)`);
  console.log('Root:', rootChildren.data);
  const cat = rootChildren.data.files[0];
  if(cat) {
    const items = await axios.get(`https://www.googleapis.com/drive/v3/files?q='${cat.id}'+in+parents+and+trashed%3Dfalse&key=${key}&fields=files(id,name,mimeType)`);
    console.log('Items:', items.data);
    if(items.data.files[0]) {
       const files = await axios.get(`https://www.googleapis.com/drive/v3/files?q='${items.data.files[0].id}'+in+parents+and+trashed%3Dfalse&key=${key}&fields=files(id,name,mimeType)`);
       console.log('Files:', files.data);
       const img = files.data.files.find(f => f.mimeType.startsWith('image'));
       if (img) {
         console.log('Fetching img:', img.id);
         try {
           const res = await axios.get(`https://www.googleapis.com/drive/v3/files/${img.id}?alt=media&key=${key}`);
           console.log('Image fetch success', res.status);
         } catch(e) {
           console.error('Image fetch error:', e.response ? e.response.status : e.message);
         }
       }
    }
  }
}
test();
