import { llm } from './llm.js';
import { PromptTemplate } from '@langchain/core/prompts';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { z } from 'zod';

// We just need the LLM to give us the patched file content and a description of the fix 
// so we can construct the exact mandated log format.
const fixSchema = z.object({
    patchedContent: z.string().describe('The full patched content of the file. Do not use markdown blocks, just the raw code.'),
    shortFixDescription: z.string().describe('A very short phrase describing the fix (e.g., "remove the import statement"). Lowercase.'),
    commitMessage: z.string().describe('A commit message beginning with "[AI-AGENT] " followed by the fix summary.')
});

export class AnalysisAndFixerAgent {
    async generateFix(fileContent, failure) {
        const parser = StructuredOutputParser.fromZodSchema(fixSchema);

        const prompt = PromptTemplate.fromTemplate(`
      You are an expert developer fixing a bug in code.
      
      Failure Details:
      - File: {file}
      - Line: {line}
      - Error: {error_message}
      - Bug Type: {bug_type}

      Provide the patched file content that fixes the bug. The patchedContent MUST BE THE COMPLETE FILE CONTENT, ready to be written to disk. Do NOT use markdown code blocks (\`\`\`).
      Provide a short phrase describing the fix (shortFixDescription).
      Provide a commit message starting EXACTLY with "[AI-AGENT] ".

      {format_instructions}

      FILE CONTENT:
      {file_content}
    `);

        try {
            const chain = prompt.pipe(llm).pipe(parser);
            const response = await chain.invoke({
                file: failure.file,
                line: failure.lineNumber,
                error_message: failure.errorMessage,
                bug_type: failure.bugType,
                file_content: fileContent,
                format_instructions: parser.getFormatInstructions(),
            });

            // strict required hackathon criteria format logging
            // LINTING error in src/utils.py line 15 → Fix: remove the import statement
            const exactLogEntry = `${failure.bugType} error in ${failure.file} line ${failure.lineNumber} \u2192 Fix: ${response.shortFixDescription}`;

            // We must console log this exactly. No extra spaces.
            console.log(exactLogEntry);

            return {
                patchedContent: response.patchedContent,
                commitMessage: response.commitMessage || `[AI-AGENT] Fixed ${failure.bugType} in ${failure.file}`
            };
        } catch (err) {
            console.error('[FixerAgent] Failed to generate fix:', err);
            return null;
        }
    }
}

export const fixerAgent = new AnalysisAndFixerAgent();
