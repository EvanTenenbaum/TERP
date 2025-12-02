// Quick test of Gemini bot context loading
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

// Load project context (simplified)
function loadContext(): string {
  const parts: string[] = [];
  
  // Load one steering file as test
  const file = path.join(process.cwd(), '.kiro/steering/00-core-identity.md');
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf-8');
    parts.push(`# TERP Context\n\n${content.substring(0, 2000)}...\n\n`);
  }
  
  // Add roadmap summary
  const roadmap = path.join(process.cwd(), 'docs/roadmaps/MASTER_ROADMAP.md');
  if (fs.existsSync(roadmap)) {
    const content = fs.readFileSync(roadmap, 'utf-8');
    const complete = (content.match(/\*\*Status:\*\*\s+complete/gi) || []).length;
    const ready = (content.match(/\*\*Status:\*\*\s+ready/gi) || []).length;
    parts.push(`\nProject Stats: ${complete} complete, ${ready} ready\n`);
  }
  
  return parts.join('');
}

async function testBot() {
  console.log('🧪 Testing Gemini bot...\n');
  
  const context = loadContext();
  console.log(`📚 Context loaded: ${context.length} characters\n`);
  
  const systemInstruction = `${context}

You are the TERP AI assistant. Provide concise, helpful responses.`;

  try {
    const chat = model.startChat({
      history: [],
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.7,
      },
      systemInstruction,
    });
    
    console.log('💬 Asking: "What is the current status of TERP?"\n');
    
    const result = await chat.sendMessage('What is the current status of TERP?');
    const response = result.response.text();
    
    console.log('🤖 Response:\n');
    console.log(response);
    console.log('\n✅ Bot test successful!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testBot();
