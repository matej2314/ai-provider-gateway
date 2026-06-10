/**
 * Boilerplate dla model-specific prompt
 * Generowany dla każdego modelu dodanego do config
 */
export function generateModelPromptTemplate(modelAlias: string): string {
  return `# Model-specific prompt: ${modelAlias}
  
  This prompt is specific to the "${modelAlias}" model.
  
  ## Model Configuration
  
  [TODO: Add model-specific instructions here]
  
  ## Use Cases
  
  [TODO: Describe when this model should be used]
  
  ## Special Considerations
  
  [TODO: Add any special handling for this model]
  
  ---
  
  *This is a boilerplate. Edit this file to customize the prompt for the "${modelAlias}" model.*
  `;
}
