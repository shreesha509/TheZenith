import { llm } from './llm.js';
import { PromptTemplate } from '@langchain/core/prompts';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { z } from 'zod';

const failureSchema = z.object({
    failures: z.array(z.object({
        file: z.string().describe('The file path where the error occurred'),
        lineNumber: z.number().describe('The line number of the error'),
        errorMessage: z.string().describe('A brief description of the error'),
        bugType: z.enum(['LINTING', 'SYNTAX', 'LOGIC', 'TYPE_ERROR', 'IMPORT', 'INDENTATION']).describe('The classified type of the bug. MUST be one of the listed enum values.')
    }))
});

export class DiscoveryAgent {
    async extractFailures(testOutput) {
        // Truncate output if it's too massive, keeping tail usually since errors are at the end
        const truncatedOutput = testOutput.length > 20000
            ? testOutput.substring(testOutput.length - 20000)
            : testOutput;

        const parser = StructuredOutputParser.fromZodSchema(failureSchema);

        const prompt = PromptTemplate.fromTemplate(`
      Analyze the following test execution output and extract failure metadata.
      Classify each failure into ONLY one of these exact types: LINTING, SYNTAX, LOGIC, TYPE_ERROR, IMPORT, INDENTATION.
      
      {format_instructions}
      
      TEST OUTPUT:
      {test_output}
    `);

        try {
            const chain = prompt.pipe(llm).pipe(parser);
            const response = await chain.invoke({
                test_output: truncatedOutput,
                format_instructions: parser.getFormatInstructions(),
            });
            return response.failures;
        } catch (err) {
            console.error('[DiscoveryAgent] Extraction failed:', err);
            // Fallback or empty
            return [];
        }
    }
}

export const discoveryAgent = new DiscoveryAgent();
