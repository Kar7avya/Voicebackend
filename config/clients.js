// 📋 config/clients.js - EXTERNAL SERVICE PHONE BOOK
// Think of this as your company's contact list for external services

import { GoogleGenerativeAI } from "@google/generative-ai";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { createClient as createDeepgramClient } from "@deepgram/sdk";

// 🤖 Connect to Google AI (like hiring a smart assistant)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 🎤 Connect to ElevenLabs (like hiring a voice expert)
const elevenlabs = new ElevenLabsClient({ 
    apiKey: process.env.ELEVENLABS_API_KEY 
});

// 📝 Connect to Deepgram (like hiring a transcription service)
const deepgram = createDeepgramClient(process.env.DEEPGRAM_API_KEY);

// Let everyone know the services are ready
console.log("📋 External services connected:");
console.log("   🤖 Google AI: Ready for smart tasks");
console.log("   🎤 ElevenLabs: Ready for voice work");
console.log("   📝 Deepgram: Ready for transcription");

// 📤 Export so other departments can use these services
export { genAI, elevenlabs, deepgram };

/*
HOW OTHER FILES USE THIS:
import { deepgram } from '../config/clients.js';
// Now they can transcribe audio: deepgram.listen.prerecorded.transcribeFile(...)
*/