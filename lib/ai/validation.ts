import type { ReviewResult } from './anthropic-client';

export interface ValidationResult {
  isValid: boolean;
  issues: string[];
  warnings: string[];
}

/**
 * Validate generated hints are progressive
 */
function validateHintsProgression(hint1: string, hint2: string, hint3: string): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  // Check that hints exist
  if (!hint1 || hint1.trim().length === 0) {
    issues.push('Hint 1 is missing or empty');
  }
  if (!hint2 || hint2.trim().length === 0) {
    issues.push('Hint 2 is missing or empty');
  }
  if (!hint3 || hint3.trim().length === 0) {
    issues.push('Hint 3 is missing or empty');
  }
  
  if (issues.length > 0) {
    return { isValid: false, issues };
  }
  
  // Check that hints are progressively more specific
  // Hint 2 should be longer or more detailed than hint 1
  if (hint2.length < hint1.length * 0.8) {
    issues.push('Hint 2 should be more detailed than Hint 1');
  }
  
  // Hint 3 should be longer or more detailed than hint 2
  if (hint3.length < hint2.length * 0.8) {
    issues.push('Hint 3 should be more detailed than Hint 2');
  }
  
  // Check for placeholder text
  const placeholderPatterns = [
    /\[.*?\]/g,
    /TODO/i,
    /placeholder/i,
    /example/i,
    /lorem ipsum/i,
  ];
  
  [hint1, hint2, hint3].forEach((hint, index) => {
    placeholderPatterns.forEach(pattern => {
      if (pattern.test(hint)) {
        issues.push(`Hint ${index + 1} may contain placeholder text`);
      }
    });
  });
  
  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Validate solution quality
 */
function validateSolution(solution: string): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  if (!solution || solution.trim().length === 0) {
    issues.push('Solution is missing or empty');
    return { isValid: false, issues };
  }
  
  // Check minimum length (should be substantial)
  if (solution.trim().length < 50) {
    issues.push('Solution is too short (minimum 50 characters)');
  }
  
  // Check for placeholder text
  const placeholderPatterns = [
    /\[.*?\]/g,
    /TODO/i,
    /placeholder/i,
    /example solution/i,
  ];
  
  placeholderPatterns.forEach(pattern => {
    if (pattern.test(solution)) {
      issues.push('Solution may contain placeholder text');
    }
  });
  
  // Check for step indicators (good sign)
  const hasSteps = /step\s*\d+|1\.|2\.|3\./i.test(solution);
  if (!hasSteps && solution.length > 200) {
    issues.push('Solution should be formatted with clear steps');
  }
  
  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Validate explanation quality
 */
function validateExplanation(explanation: string): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  if (!explanation || explanation.trim().length === 0) {
    issues.push('Explanation is missing or empty');
    return { isValid: false, issues };
  }
  
  // Check minimum length
  if (explanation.trim().length < 100) {
    issues.push('Explanation is too short (minimum 100 characters)');
  }
  
  // Check for placeholder text
  const placeholderPatterns = [
    /\[.*?\]/g,
    /TODO/i,
    /placeholder/i,
    /example explanation/i,
  ];
  
  placeholderPatterns.forEach(pattern => {
    if (pattern.test(explanation)) {
      issues.push('Explanation may contain placeholder text');
    }
  });
  
  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Validate complete review result
 */
export function validateReviewResult(result: ReviewResult): ValidationResult {
  const allIssues: string[] = [];
  const warnings: string[] = [];
  
  // Validate hints
  const hintsValidation = validateHintsProgression(
    result.hint1,
    result.hint2,
    result.hint3
  );
  allIssues.push(...hintsValidation.issues);
  
  // Validate solution
  const solutionValidation = validateSolution(result.solution);
  allIssues.push(...solutionValidation.issues);
  
  // Validate explanation
  const explanationValidation = validateExplanation(result.explanation);
  allIssues.push(...explanationValidation.issues);
  
  // Check for very long content (might be too verbose)
  if (result.solution.length > 5000) {
    warnings.push('Solution is very long - consider if it needs to be more concise');
  }
  
  if (result.explanation.length > 5000) {
    warnings.push('Explanation is very long - consider if it needs to be more concise');
  }
  
  // Check token usage if available
  if (result.tokensUsed && result.tokensUsed > 10000) {
    warnings.push('High token usage - review may be expensive');
  }
  
  return {
    isValid: allIssues.length === 0,
    issues: allIssues,
    warnings,
  };
}

/**
 * Check if content contains incomplete responses
 */
export function checkForIncompleteContent(content: string): boolean {
  const incompletePatterns = [
    /\.\.\.$/,
    /incomplete/i,
    /to be continued/i,
    /\[cut off\]/i,
    /\[truncated\]/i,
  ];
  
  return incompletePatterns.some(pattern => pattern.test(content));
}

