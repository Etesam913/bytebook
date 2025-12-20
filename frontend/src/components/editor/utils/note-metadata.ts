import type { Frontmatter } from '../../../types';

const frontMatterRegex = /^---[\s\S]+?---/;

/**
 * Checks if a Markdown string contains front matter.
 *
 * Front matter is a section at the beginning of a Markdown file
 * that is enclosed within triple dashes (`---`). It is commonly used
 * for metadata such as title, author, date, etc.
 *
 * @param {string} markdown - The Markdown string to check.
 * @returns {boolean} - Returns `true` if the Markdown string contains front matter, `false` otherwise.
 */
function hasFrontMatter(markdown: string): boolean {
  return frontMatterRegex.test(markdown);
}

function parseYaml(yamlString: string): Frontmatter {
  const lines = yamlString.split('\n');
  const frontMatter: Frontmatter = {};
  let currentKey: string | null = null;
  let currentArray: string[] = [];

  lines.forEach((line) => {
    const trimmedLine = line.trim();

    // Skip empty lines and the --- delimiters
    if (!trimmedLine || trimmedLine === '---') {
      return;
    }

    // Check if this is a list item (starts with dash)
    if (trimmedLine.startsWith('- ')) {
      if (currentKey) {
        currentArray.push(trimmedLine.substring(2).trim());
      }
      return;
    }

    // If we were building an array and encounter a new key, save the array
    if (currentKey && currentArray.length > 0) {
      frontMatter[currentKey] = currentArray;
      currentArray = [];
      currentKey = null;
    }

    // Parse key-value pairs
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();

      if (value) {
        // This is a simple key-value pair
        frontMatter[key] = value;
        currentKey = null;
      } else {
        // This might be the start of an array
        currentKey = key;
        currentArray = [];
      }
    }
  });

  // Handle any remaining array at the end
  if (currentKey && currentArray.length > 0) {
    frontMatter[currentKey] = currentArray;
  }

  return frontMatter;
}

export function parseFrontMatter(markdown: string): {
  frontMatter: Frontmatter;
  content: string;
} {
  const match = markdown.match(frontMatterRegex);

  let frontMatter: Frontmatter = {};
  let content = markdown;

  if (match) {
    const frontMatterString = match[0];
    frontMatter = parseYaml(frontMatterString);
    // We do +1 as there is a newline from the --- that we want to get rid of
    content = markdown.slice(match[0].length + 1);
  }
  return { frontMatter, content };
}

/**
 * Creates front matter from a frontmatter object.
 *
 * This function takes a Frontmatter object and generates a front matter section
 * formatted with triple dashes (`---`). String arrays are formatted as YAML lists with dashes.
 *
 * @param {Frontmatter} data - The frontmatter object to include in the front matter.
 * @returns {string} - The generated front matter string.
 */
function createFrontMatter(data: Frontmatter): string {
  // Initialize the front matter string with the opening triple dashes
  let frontMatter = '---\n';

  // Iterate over each key-value pair in the input object
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      // Handle array values as YAML lists with dashes
      frontMatter += `${key}:\n`;
      for (const item of value) {
        frontMatter += `  - ${item}\n`;
      }
    } else {
      // Handle string values as simple key-value pairs
      frontMatter += `${key}: ${value}\n`;
    }
  }

  // Close the front matter section with the closing triple dashes
  frontMatter += '---\n';

  // Return the generated front matter string
  return frontMatter;
}

/**
 * Replaces the front matter in a Markdown string with new front matter.
 *
 * If the Markdown string already contains front matter, it will be replaced with the new front matter.
 * If no front matter is found, the new front matter will be prepended to the Markdown content.
 *
 * @param {string} markdown - The original Markdown string.
 * @param {Frontmatter} newFrontMatterData - The frontmatter object for the new front matter.
 * @returns {string} - The Markdown string with the replaced or prepended front matter.
 */
export function replaceFrontMatter(
  markdown: string,
  newFrontMatterData: Frontmatter
): string {
  // Create the new front matter string from the provided data
  const newFrontMatter = createFrontMatter(newFrontMatterData);
  if (hasFrontMatter(markdown)) {
    // If existing front matter is found, replace it with the new front matter
    return markdown.replace(frontMatterRegex, newFrontMatter);
  }
  // If no front matter is found, prepend the new front matter to the markdown content
  return newFrontMatter + markdown;
}
