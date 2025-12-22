import Anthropic from '@anthropic-ai/sdk';
import type { Question } from '@/types/database';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

export interface ReviewResult {
  hint1: string;
  hint2: string;
  hint3: string;
  solution: string;
  explanation: string;
  tokensUsed?: number;
  durationMs?: number;
}

export interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry wrapper with exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries || MAX_RETRIES;
  const retryDelay = options.retryDelay || INITIAL_RETRY_DELAY;
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on certain errors
      if (error.status === 401 || error.status === 403) {
        throw error; // Authentication errors shouldn't be retried
      }
      
      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Calculate exponential backoff delay
      const delay = retryDelay * Math.pow(2, attempt);
      
      // Check if it's a rate limit error (429)
      if (error.status === 429) {
        const retryAfter = error.headers?.['retry-after'] 
          ? parseInt(error.headers['retry-after']) * 1000 
          : delay;
        await sleep(retryAfter);
      } else {
        await sleep(delay);
      }
    }
  }
  
  throw lastError || new Error('Unknown error in retry logic');
}

/**
 * Generate progressive hints for a question
 */
export async function generateHints(
  question: Question,
  subjectName?: string
): Promise<{ hint1: string; hint2: string; hint3: string; tokensUsed?: number }> {
  const isMathematics = subjectName?.toLowerCase().includes('math') || 
                        question.subject_id?.toLowerCase().includes('math');
  
  const prompt = isMathematics
    ? `You are an expert mathematics tutor. Generate three progressive hints for this multiple-choice question.

Question: ${question.question_text}
${question.passage ? `\nPassage: ${question.passage}` : ''}
${question.question_image_url ? `\nNote: This question includes an image.` : ''}

Options:
A) ${question.option_a}
B) ${question.option_b}
C) ${question.option_c}
D) ${question.option_d}
${question.option_e ? `E) ${question.option_e}` : ''}

Correct Answer: ${question.correct_answer}

Generate three hints that progressively guide the student:
- Hint 1: Broad guidance - helps student understand what concept or approach to use
- Hint 2: More specific - provides more direction toward the solution
- Hint 3: Near-complete guidance - almost reveals the answer but still requires some thinking

Format your response as JSON:
{
  "hint1": "...",
  "hint2": "...",
  "hint3": "..."
}

Each hint should be concise (2-3 sentences max) and educational.`
    : `You are an expert tutor. Generate three progressive hints for this multiple-choice question.

Question: ${question.question_text}
${question.passage ? `\nPassage: ${question.passage}` : ''}
${question.question_image_url ? `\nNote: This question includes an image.` : ''}

Options:
A) ${question.option_a}
B) ${question.option_b}
C) ${question.option_c}
D) ${question.option_d}
${question.option_e ? `E) ${question.option_e}` : ''}

Correct Answer: ${question.correct_answer}

Generate three hints that progressively guide the student:
- Hint 1: Broad guidance - helps student understand what concept or approach to use
- Hint 2: More specific - provides more direction toward the solution
- Hint 3: Near-complete guidance - almost reveals the answer but still requires some thinking

Format your response as JSON:
{
  "hint1": "...",
  "hint2": "...",
  "hint3": "..."
}

Each hint should be concise (2-3 sentences max) and educational.`;

  const startTime = Date.now();
  
  const response = await withRetry(async () => {
    return await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: prompt,
      }],
    });
  });

  const durationMs = Date.now() - startTime;
  const tokensUsed = response.usage?.input_tokens && response.usage?.output_tokens
    ? response.usage.input_tokens + response.usage.output_tokens
    : undefined;

  // Extract JSON from response
  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Anthropic API');
  }

  try {
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      hint1: parsed.hint1 || '',
      hint2: parsed.hint2 || '',
      hint3: parsed.hint3 || '',
      tokensUsed,
    };
  } catch (error) {
    throw new Error(`Failed to parse hints response: ${error}`);
  }
}

/**
 * Generate step-by-step solution for a question
 */
export async function generateSolution(
  question: Question,
  subjectName?: string
): Promise<{ solution: string; tokensUsed: number }> {
  const isMathematics = subjectName?.toLowerCase().includes('math') || 
                        question.subject_id?.toLowerCase().includes('math');
  
  const prompt = isMathematics
    ? `You are an expert mathematics tutor. Provide a detailed, step-by-step solution for this multiple-choice question.

Question: ${question.question_text}
${question.passage ? `\nPassage: ${question.passage}` : ''}
${question.question_image_url ? `\nNote: This question includes an image.` : ''}

Options:
A) ${question.option_a}
B) ${question.option_b}
C) ${question.option_c}
D) ${question.option_d}
${question.option_e ? `E) ${question.option_e}` : ''}

Correct Answer: ${question.correct_answer}

Provide a clear, step-by-step solution that:
1. Explains the approach or method to use
2. Shows all calculations and work clearly
3. Explains why the correct answer is correct
4. Mentions why other options might be tempting but are incorrect

Format your solution with clear steps and explanations.`
    : `You are an expert tutor. Provide a detailed, step-by-step solution for this multiple-choice question.

Question: ${question.question_text}
${question.passage ? `\nPassage: ${question.passage}` : ''}
${question.question_image_url ? `\nNote: This question includes an image.` : ''}

Options:
A) ${question.option_a}
B) ${question.option_b}
C) ${question.option_c}
D) ${question.option_d}
${question.option_e ? `E) ${question.option_e}` : ''}

Correct Answer: ${question.correct_answer}

Provide a clear, step-by-step solution that:
1. Explains the approach or reasoning
2. Shows how to arrive at the correct answer
3. Explains why the correct answer is correct
4. Mentions why other options might be tempting but are incorrect

Format your solution with clear steps and explanations.`;

  const startTime = Date.now();
  
  const response = await withRetry(async () => {
    return await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: prompt,
      }],
    });
  });

  const durationMs = Date.now() - startTime;
  const tokensUsed = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Anthropic API');
  }

  // Return both solution and tokens for tracking
  return { solution: content.text, tokensUsed };
}

/**
 * Generate detailed explanation for non-mathematics subjects
 */
export async function generateExplanation(
  question: Question,
  subjectName?: string
): Promise<{ explanation: string; tokensUsed: number }> {
  const prompt = `You are an expert tutor. Provide a detailed explanation for this multiple-choice question.

Question: ${question.question_text}
${question.passage ? `\nPassage: ${question.passage}` : ''}
${question.question_image_url ? `\nNote: This question includes an image.` : ''}

Options:
A) ${question.option_a}
B) ${question.option_b}
C) ${question.option_c}
D) ${question.option_d}
${question.option_e ? `E) ${question.option_e}` : ''}

Correct Answer: ${question.correct_answer}

Provide a comprehensive explanation that:
1. Explains the key concepts and context
2. Shows why the correct answer is the best choice
3. Explains why other options are incorrect
4. Provides additional context or related information that helps students understand the topic better

Make the explanation educational and detailed, helping students learn from the question.`;

  const startTime = Date.now();
  
  const response = await withRetry(async () => {
    return await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: prompt,
      }],
    });
  });

  const durationMs = Date.now() - startTime;
  const tokensUsed = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Anthropic API');
  }

  // Return both explanation and tokens for tracking
  return { explanation: content.text, tokensUsed };
}

/**
 * Review a complete question - generates all content (hints, solution, explanation)
 */
export async function reviewQuestion(
  question: Question,
  subjectName?: string
): Promise<ReviewResult> {
  const startTime = Date.now();
  let totalTokens = 0;
  
  try {
    // Generate all content in parallel for efficiency
    const [hintsResult, solutionResult, explanationResult] = await Promise.all([
      generateHints(question, subjectName),
      generateSolution(question, subjectName),
      generateExplanation(question, subjectName),
    ]);

    const durationMs = Date.now() - startTime;

    // Extract tokens and content
    const hints = hintsResult;
    const solution = solutionResult.solution;
    const solutionTokens = solutionResult.tokensUsed;
    const explanation = explanationResult.explanation;
    const explanationTokens = explanationResult.tokensUsed;

    totalTokens = (hints.tokensUsed || 0) + solutionTokens + explanationTokens;

    return {
      hint1: hints.hint1,
      hint2: hints.hint2,
      hint3: hints.hint3,
      solution,
      explanation,
      durationMs,
      tokensUsed: totalTokens,
    };
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    throw {
      ...error,
      durationMs,
    };
  }
}

