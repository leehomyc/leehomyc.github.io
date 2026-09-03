import { readFile, writeFile } from 'node:fs/promises';
import process from 'node:process';

const sourcePath = new URL('../index.html', import.meta.url);
const outputPath = new URL('../github_stars.json', import.meta.url);
const source = await readFile(sourcePath, 'utf8');
const repositories = [...new Set(
    [...source.matchAll(/data-repo=["']([^"']+)["']/g)].map((match) => match[1])
)].sort((a, b) => a.localeCompare(b));

if (!repositories.length) {
    throw new Error('No GitHub repositories found in index.html');
}

const token = process.env.GITHUB_TOKEN;
if (!token) {
    throw new Error('GITHUB_TOKEN is required');
}

const stars = {};
for (const repository of repositories) {
    const encodedRepository = repository.split('/').map(encodeURIComponent).join('/');
    const response = await fetch(`https://api.github.com/repos/${encodedRepository}`, {
        headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${token}`,
            'User-Agent': 'leehomyc.github.io-star-cache',
            'X-GitHub-Api-Version': '2022-11-28'
        }
    });

    if (!response.ok) {
        throw new Error(`GitHub returned ${response.status} for ${repository}`);
    }

    const repositoryData = await response.json();
    if (!Number.isInteger(repositoryData.stargazers_count)) {
        throw new Error(`Missing stargazers_count for ${repository}`);
    }
    stars[repository] = repositoryData.stargazers_count;
}

const cache = {
    updated_at: new Date().toISOString(),
    stars
};

try {
    const existingCache = JSON.parse(await readFile(outputPath, 'utf8'));
    if (JSON.stringify(existingCache.stars) === JSON.stringify(stars)) {
        console.log(`Checked ${repositories.length} repositories; star counts are unchanged.`);
        process.exit(0);
    }
} catch (error) {
    if (error.code !== 'ENOENT') {
        throw error;
    }
}

await writeFile(outputPath, `${JSON.stringify(cache, null, 2)}\n`);
console.log(`Updated ${repositories.length} GitHub star counts.`);
