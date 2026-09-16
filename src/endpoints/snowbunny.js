import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import express from 'express';
import { sync as writeFileAtomicSync } from 'write-file-atomic';

export const router = express.Router();

const SCHEMA_VERSION = 1;
const DIRECTORY_NAME = 'snowbunny';
const LOREBOOK_DIRECTORY = 'lorebooks';

function lorebookDirectory(request) {
    const root = request.user?.directories?.root;
    if (!root) throw new Error('User data directory is unavailable.');
    const directory = path.join(root, DIRECTORY_NAME, LOREBOOK_DIRECTORY);
    fs.mkdirSync(directory, { recursive: true });
    return directory;
}

function safeId(value) {
    const id = String(value || '').trim();
    if (!/^[a-zA-Z0-9_-]{8,128}$/.test(id)) return null;
    return id;
}

function fileFor(request, id) {
    const valid = safeId(id);
    if (!valid) throw new Error('Invalid SnowBunny resource id.');
    return path.join(lorebookDirectory(request), `${valid}.json`);
}

function plainObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value);
}

function stringArray(value, max = 200) {
    if (!Array.isArray(value)) return [];
    return value
        .slice(0, max)
        .map(item => String(item ?? '').trim())
        .filter(Boolean);
}

function normalizeSection(section, index) {
    if (!plainObject(section)) return null;
    const label = String(section.label ?? section.name ?? '').trim().slice(0, 200);
    const text = String(section.text ?? section.value ?? '').slice(0, 500_000);
    if (!label && !text) return null;
    return {
        id: safeId(section.id) || `section_${index}_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`,
        label: label || 'Section',
        text,
        order: Number.isFinite(Number(section.order)) ? Number(section.order) : index,
        custom: section.custom === true,
    };
}

function normalizeEntry(entry, index) {
    if (!plainObject(entry)) return null;
    const name = String(entry.name ?? '').trim().slice(0, 300);
    if (!name) return null;
    const sections = Array.isArray(entry.sections)
        ? entry.sections.map(normalizeSection).filter(Boolean)
        : [];
    return {
        id: safeId(entry.id) || `entry_${crypto.randomUUID().replaceAll('-', '')}`,
        name,
        type: String(entry.type ?? 'Other').trim().slice(0, 80) || 'Other',
        aliases: stringArray(entry.aliases, 100),
        tags: stringArray(entry.tags, 100),
        enabled: entry.enabled !== false,
        alwaysActive: entry.alwaysActive === true,
        description: String(entry.description ?? '').slice(0, 500_000),
        sections,
        image: plainObject(entry.image) ? {
            kind: String(entry.image.kind ?? '').slice(0, 30),
            value: String(entry.image.value ?? '').slice(0, 2_000_000),
        } : null,
        createdAt: Number(entry.createdAt) || Date.now(),
        updatedAt: Number(entry.updatedAt) || Date.now(),
        order: Number.isFinite(Number(entry.order)) ? Number(entry.order) : index,
    };
}

function normalizeRetrieval(value) {
    const retrieval = plainObject(value) ? value : {};
    const mode = retrieval.mode === 'meaning' ? 'meaning' : 'keywords';
    return {
        mode,
        scanDepth: Math.max(0, Math.min(100, Number(retrieval.scanDepth) || 7)),
        maxMatches: Math.max(1, Math.min(100, Number(retrieval.maxMatches) || 3)),
        threshold: Math.max(0, Math.min(1, Number(retrieval.threshold) || 0.45)),
        loreBudgetChars: Math.max(500, Math.min(500_000, Number(retrieval.loreBudgetChars) || 12_000)),
    };
}

function normalizeBook(input, existing = null) {
    if (!plainObject(input)) throw new Error('Lorebook payload must be an object.');
    const now = Date.now();
    const id = safeId(input.id) || existing?.id || `lore_${crypto.randomUUID().replaceAll('-', '')}`;
    const name = String(input.name ?? existing?.name ?? '').trim().slice(0, 300);
    if (!name) throw new Error('Lorebook name is required.');
    const entries = Array.isArray(input.entries)
        ? input.entries.map(normalizeEntry).filter(Boolean)
        : Array.isArray(existing?.entries) ? existing.entries : [];
    return {
        schemaVersion: SCHEMA_VERSION,
        id,
        name,
        description: String(input.description ?? existing?.description ?? '').slice(0, 100_000),
        tags: stringArray(input.tags ?? existing?.tags, 100),
        retrieval: normalizeRetrieval(input.retrieval ?? existing?.retrieval),
        entries,
        createdAt: Number(existing?.createdAt ?? input.createdAt) || now,
        updatedAt: now,
    };
}

function readBook(request, id) {
    const filename = fileFor(request, id);
    if (!fs.existsSync(filename)) return null;
    const parsed = JSON.parse(fs.readFileSync(filename, 'utf8'));
    return normalizeBook(parsed, parsed);
}

router.post('/lorebooks/list', async (request, response) => {
    try {
        const directory = lorebookDirectory(request);
        const files = (await fs.promises.readdir(directory, { withFileTypes: true }))
            .filter(file => file.isFile() && file.name.endsWith('.json'));
        const books = [];
        for (const file of files) {
            try {
                const parsed = JSON.parse(await fs.promises.readFile(path.join(directory, file.name), 'utf8'));
                const book = normalizeBook(parsed, parsed);
                books.push({
                    id: book.id,
                    name: book.name,
                    description: book.description,
                    tags: book.tags,
                    retrieval: book.retrieval,
                    entryCount: book.entries.length,
                    createdAt: book.createdAt,
                    updatedAt: book.updatedAt,
                });
            } catch (error) {
                console.warn(`Could not read SnowBunny lorebook ${file.name}:`, error);
            }
        }
        books.sort((a, b) => b.updatedAt - a.updatedAt || a.name.localeCompare(b.name));
        return response.json({ schemaVersion: SCHEMA_VERSION, lorebooks: books });
    } catch (error) {
        console.error('Could not list SnowBunny lorebooks:', error);
        return response.status(500).json({ error: 'Could not list Lorebooks.' });
    }
});

router.post('/lorebooks/get', (request, response) => {
    try {
        const id = safeId(request.body?.id);
        if (!id) return response.status(400).json({ error: 'Lorebook id is required.' });
        const book = readBook(request, id);
        if (!book) return response.sendStatus(404);
        return response.json(book);
    } catch (error) {
        console.error('Could not read SnowBunny lorebook:', error);
        return response.status(500).json({ error: 'Could not read Lorebook.' });
    }
});

router.post('/lorebooks/save', (request, response) => {
    try {
        const incoming = request.body?.lorebook;
        if (!plainObject(incoming)) return response.status(400).json({ error: 'Lorebook payload is required.' });
        const requestedId = safeId(incoming.id);
        const existing = requestedId ? readBook(request, requestedId) : null;
        const book = normalizeBook(incoming, existing);
        writeFileAtomicSync(fileFor(request, book.id), JSON.stringify(book, null, 2));
        return response.json(book);
    } catch (error) {
        console.error('Could not save SnowBunny lorebook:', error);
        return response.status(400).json({ error: String(error?.message || 'Could not save Lorebook.') });
    }
});

router.post('/lorebooks/delete', (request, response) => {
    try {
        const id = safeId(request.body?.id);
        if (!id) return response.status(400).json({ error: 'Lorebook id is required.' });
        const filename = fileFor(request, id);
        if (fs.existsSync(filename)) fs.unlinkSync(filename);
        return response.json({ ok: true });
    } catch (error) {
        console.error('Could not delete SnowBunny lorebook:', error);
        return response.status(500).json({ error: 'Could not delete Lorebook.' });
    }
});
