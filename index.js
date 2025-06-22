import express from 'express';
import dotenv from 'dotenv';
import multer from 'multer';

import fs from 'fs';
import path from 'path';
import fsp from 'fs/promises'; // Import fs.promises for asynchronous file deletion

import { GoogleGenAI } from '@google/genai';

//setup app
dotenv.config();

// initialize express app
const app = express();

//add middleware
app.use(
    // add express.json() middleware to parse JSON request bodies
    // content-type: application/json
    express.json()
);

// initiate models
// use gemini-2.0-flash model
const ai = new GoogleGenAI({ 
    apiKey: process.env.GOOGLE_GEMINI_API_KEY });

// const result = await ai.models.generateContent({model: "gemini-2.0-flash", contents: "Hi there!"});
// console.log(result.text);


const upload = multer({ 
    dest: 'uploads/' 
});

// route endpoints
app.post('/generate-text', async (req, res) => {
    const {prompt} = req.body;
    try {
        const result = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            // contents: prompt
            contents: [
                {
                    role: "user",
                    parts: [{ text: prompt }]
                }
            ]
        });
        res.json({ 
            output: result.text 
        });
    } catch (e) {
        console.error('Error generating content:', e);
        res.status(500).json({ error: e.message || 'Failed to generate content.' });
    }

});

// upload single image from form-data
// use multer to handle file uploads
// example upload.single('file') where 'file' is the name of the form field -> will be searched in FormData named 'file'
app.post('/generate-from-image', upload.single('image'), async (req, res) => {
    // const { prompt = "Describe this uploaded image" } = req.body;
    
    // // Ensure a file was uploaded
    // if (!req.file) {
    //     return res.status(400).json({ error: 'No image file uploaded.' });
    // }

    // try {
    //     // Read the image file content as a Buffer
    //     const imageBuffer = fs.readFileSync(req.file.path);
    //     // Convert the Buffer to a base64 encoded string
    //     const base64Image = imageBuffer.toString('base64');
    //     // Get the MIME type from the uploaded file information
    //     const mimeType = req.file.mimetype;
    //     console.log(imageBuffer);

    //     const result = await ai.models.generateContent({
    //         model: "gemini-2.0-flash",
    //         contents: [
    //             {
    //                 role: "user",
    //                 parts: [{ text: prompt }]
    //             },
    //             {
    //                 role: "user",
    //                 parts: [{
    //                     inlineData: {
    //                         data: base64Image,
    //                         mimeType: mimeType
    //                     }
    //                 }]
    //             }
    //         ]
    //     });

    //     // Send the generated text back as a response
    //     res.json({ output: result.text });

    // } catch (e) {
    //     console.error('Error generating content from image:', e);
    //     res.status(500).json({ error: e.message || 'Failed to generate content from image.' });
    // } finally {
    //     // Clean up the uploaded file from the server's disk
    //     if (req.file && req.file.path) {
    //         try {
    //             await fsp.unlink(req.file.path); // Use fs.promises.unlink for async deletion
    //         } catch (unlinkError) {
    //             console.error('Error deleting uploaded file:', unlinkError);
    //         }
    //     }
    // }

  const { prompt = "Describe this uploaded image." } = req.body;

  try {
    // 1. Baca file gambar
    const image = await ai.files.upload({
      file: req.file.path,
      config: {
        mimeType: req.file.mimetype
      }
    });
    console.log({image});
    // 3. Sertakan dalam prompt
    const result = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
    {
        role: "user",
        parts: [
        { text: prompt },
        {
            fileData: {
            mimeType: image.mimeType,
            fileUri: image.uri, // Harus berupa URI Gemini, bukan URL publik
            }
        }
        ]
    }
    ]

    });

    console.log(result.text);

    res.json({ output: result.text });
  } catch (error) {
    console.error("Error generating content:", error);
    res.status(500).json({ error: error.message });
  } finally {
    fs.unlinkSync(req.file.path);
  }
});

app.post('/generate-from-document', upload.single('document'), async (req, res) => {
  const { prompt = "Describe this uploaded document." } = req.body;

  try {
    const filePath = req.file.path;
    const buffer = fs.readFileSync(filePath);
    const base64Data = buffer.toString('base64');
    const mimeType = req.file.mimetype;

    const documentPart = {
      inlineData: { data: base64Data, mimeType }
    };

    console.log({documentPart});

    const result = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
            role: "user",
            parts: [
            { text: prompt },
            documentPart
            ]
        }
        ],
    });

    console.log(result.text);

    res.json({ output: result.text });
  } catch (e) {
    console.error("Error generating content:", e);
    res.status(500).json({
      error: e.message
    });
  } finally {
    fs.unlinkSync(req.file.path);
  }

});

app.post('/generate-from-audio', upload.single('audio'), async (req, res) => {
  const { prompt = "Describe this uploaded audio." } = req.body;

  try {
    const audioBuffer = fs.readFileSync(req.file.path);
    const base64Audio = audioBuffer.toString('base64');
    const mimeType = req.file.mimetype;

    const audioPart = {
      inlineData: { data: base64Audio, mimeType }
    };

    console.log({audioPart});

    const result = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{
          role: "user",
          parts: [
            { text: prompt },
            audioPart
          ]
        }
      ],
    });

    console.log(result.text);

    res.json({ output: result.text });
  } catch (error) {
    console.error("Error generating content:", error);
    res.status(500).json({ error: error.message });
  } finally {
    fs.unlinkSync(req.file.path);
  }
});



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    });



