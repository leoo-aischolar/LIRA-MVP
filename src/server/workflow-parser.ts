import { EndChatWorkflowResult } from '@/types/chat';

const FALLBACK_END_CHAT_RESULT: EndChatWorkflowResult = {
  chatSummary: '',
  reflectionCard: '',
  structurePoints: {
    chatTheme: '',
    chatEmotions: '',
    coreEvent: '',
    relationshipImpact: '',
    deepNeed: '',
  },
};

const STRUCTURE_SECTION_ALIASES = ['structure_points', 'structure points', '结构化要点', '结构点'];

const FIELD_ALIASES = {
  chatSummary: ['chat_summary', 'chatSummary', 'chat summary', 'summary', '聊天总结', '会话总结'],
  reflectionCard: ['reflection_card', 'reflectionCard', 'reflection card', '反思卡片', '反思'],
  chatTheme: ['chat_theme', 'chatTheme', 'chat theme', '主题'],
  chatEmotions: ['chat_emotions', 'chatEmotions', 'chat emotions', '情绪'],
  coreEvent: ['core_event', 'coreEvent', 'core event', '核心事件'],
  relationshipImpact: ['relationship_impact', 'relationshipImpact', 'relationship impact', '关系影响'],
  deepNeed: ['deep_need', 'deepNeed', 'deep need', '深层需求'],
} as const;

type FieldKey = keyof typeof FIELD_ALIASES;

type PlainRecord = Record<string, unknown>;

const FIELD_ORDER: FieldKey[] = [
  'chatSummary',
  'reflectionCard',
  'chatTheme',
  'chatEmotions',
  'coreEvent',
  'relationshipImpact',
  'deepNeed',
];

function isRecord(value: unknown): value is PlainRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasAnyContent(result: EndChatWorkflowResult): boolean {
  return [
    result.chatSummary,
    result.reflectionCard,
    result.structurePoints.chatTheme,
    result.structurePoints.chatEmotions,
    result.structurePoints.coreEvent,
    result.structurePoints.relationshipImpact,
    result.structurePoints.deepNeed,
  ].some((item) => item.trim().length > 0);
}

function stripCodeFence(input: string): string {
  return input
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .replace(/```(?:json)?/gi, '')
    .replace(/```/g, '');
}

function normalizeMultilineText(input: string): string {
  return stripCodeFence(input).replace(/\r\n/g, '\n').trim();
}

function extractInnerDataCandidate(raw: unknown): unknown {
  if (!isRecord(raw)) {
    return raw;
  }

  const topData = raw.data;
  if (isRecord(topData)) {
    if (topData.data !== undefined) {
      return topData.data;
    }

    if (topData.output !== undefined) {
      return topData.output;
    }

    return topData;
  }

  if (topData !== undefined) {
    return topData;
  }

  if (raw.output !== undefined) {
    return raw.output;
  }

  return raw;
}

function parsePossiblyStringifiedJson(input: string): unknown {
  let current = normalizeMultilineText(input);

  for (let i = 0; i < 3; i += 1) {
    const parsed = JSON.parse(current);

    if (typeof parsed === 'string') {
      current = normalizeMultilineText(parsed);
      continue;
    }

    return parsed;
  }

  return null;
}

function unwrapBusinessObject(input: unknown, depth = 0): PlainRecord | null {
  if (depth > 5 || input === null || input === undefined) {
    return null;
  }

  if (typeof input === 'string') {
    const parsed = parsePossiblyStringifiedJson(input);
    return unwrapBusinessObject(parsed, depth + 1);
  }

  if (!isRecord(input)) {
    return null;
  }

  const nestedCandidates: unknown[] = [input.data, input.output, input.payload, input.result];
  for (const nested of nestedCandidates) {
    if (nested === undefined) {
      continue;
    }

    const maybe = unwrapBusinessObject(nested, depth + 1);
    if (maybe) {
      return maybe;
    }
  }

  return input;
}

function getFirstString(record: PlainRecord, keys: readonly string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (value === null || value === undefined) {
      continue;
    }

    const text = String(value).trim();
    if (text.length > 0) {
      return text;
    }
  }

  return '';
}

function resolveStructureRecord(record: PlainRecord): PlainRecord {
  const candidates: unknown[] = [record.structure_points, record.structurePoints];

  for (const candidate of candidates) {
    if (isRecord(candidate)) {
      return candidate;
    }

    if (typeof candidate !== 'string') {
      continue;
    }

    try {
      const parsed = parsePossiblyStringifiedJson(candidate);
      if (isRecord(parsed)) {
        return parsed;
      }
    } catch {
      continue;
    }
  }

  return {};
}

function mapRecordToResult(record: PlainRecord): EndChatWorkflowResult {
  const structureRecord = resolveStructureRecord(record);

  return {
    chatSummary: getFirstString(record, FIELD_ALIASES.chatSummary),
    reflectionCard: getFirstString(record, FIELD_ALIASES.reflectionCard),
    structurePoints: {
      chatTheme:
        getFirstString(structureRecord, FIELD_ALIASES.chatTheme) ||
        getFirstString(record, FIELD_ALIASES.chatTheme),
      chatEmotions:
        getFirstString(structureRecord, FIELD_ALIASES.chatEmotions) ||
        getFirstString(record, FIELD_ALIASES.chatEmotions),
      coreEvent:
        getFirstString(structureRecord, FIELD_ALIASES.coreEvent) ||
        getFirstString(record, FIELD_ALIASES.coreEvent),
      relationshipImpact:
        getFirstString(structureRecord, FIELD_ALIASES.relationshipImpact) ||
        getFirstString(record, FIELD_ALIASES.relationshipImpact),
      deepNeed:
        getFirstString(structureRecord, FIELD_ALIASES.deepNeed) ||
        getFirstString(record, FIELD_ALIASES.deepNeed),
    },
  };
}

function tryParseByJsonEngine(raw: unknown): EndChatWorkflowResult | null {
  const innerDataCandidate = extractInnerDataCandidate(raw);

  let parsedRecord: PlainRecord | null = null;

  try {
    parsedRecord = unwrapBusinessObject(innerDataCandidate);
  } catch {
    return null;
  }

  if (!parsedRecord) {
    return null;
  }

  const result = mapRecordToResult(parsedRecord);
  return hasAnyContent(result) ? result : null;
}

function flattenUnknownToText(value: unknown, seen = new WeakSet<object>()): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => flattenUnknownToText(item, seen)).filter(Boolean).join('\n');
  }

  if (!isRecord(value)) {
    return String(value);
  }

  if (seen.has(value)) {
    return '';
  }
  seen.add(value);

  const rows: string[] = [];
  for (const [key, nested] of Object.entries(value)) {
    const nestedText = flattenUnknownToText(nested, seen).trim();
    if (!nestedText) {
      continue;
    }

    if (nestedText.includes('\n')) {
      rows.push(`${key}:`);
      rows.push(nestedText);
    } else {
      rows.push(`${key}: ${nestedText}`);
    }
  }

  return rows.join('\n');
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeExtractedValue(input: string): string {
  let value = input.replace(/\r\n/g, '\n').trim();
  value = value.replace(/,\s*$/, '').trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'")) ||
    (value.startsWith('“') && value.endsWith('”'))
  ) {
    value = value.slice(1, -1).trim();
  }

  return value.replace(/\\n/g, '\n').trim();
}

function uniqueValues(input: string[]): string[] {
  return Array.from(new Set(input));
}

function extractFieldWithRegex(sourceText: string, field: FieldKey): string {
  const currentAliases = FIELD_ALIASES[field];
  const currentIndex = FIELD_ORDER.indexOf(field);
  const stopAliases = uniqueValues([
    ...FIELD_ORDER.slice(currentIndex + 1).flatMap((key) => FIELD_ALIASES[key]),
    ...STRUCTURE_SECTION_ALIASES,
  ]);

  const keyPattern = currentAliases.map(escapeRegex).join('|');
  const stopPattern = stopAliases.map(escapeRegex).join('|');
  const optionalQuote = String.raw`(?:\\?["'“”])?`;

  const pattern = new RegExp(
    `(?:^|\\n|\\{|,)\\s*${optionalQuote}(?:${keyPattern})${optionalQuote}\\s*[：:]\\s*([\\s\\S]*?)(?=(?:\\n|,|\\})\\s*${optionalQuote}(?:${stopPattern})${optionalQuote}\\s*[：:]|$)`,
    'i',
  );

  const match = sourceText.match(pattern);
  if (!match?.[1]) {
    return '';
  }

  return normalizeExtractedValue(match[1]);
}

function tryParseByRegexEngine(raw: unknown): EndChatWorkflowResult | null {
  const innerDataCandidate = extractInnerDataCandidate(raw);
  const sourceText = normalizeMultilineText(flattenUnknownToText(innerDataCandidate));

  if (!sourceText) {
    return null;
  }

  // Support keys like \"chat_summary\" in degraded model outputs.
  const tolerantText = sourceText.replace(/\\"/g, '"');

  const result: EndChatWorkflowResult = {
    chatSummary: extractFieldWithRegex(tolerantText, 'chatSummary'),
    reflectionCard: extractFieldWithRegex(tolerantText, 'reflectionCard'),
    structurePoints: {
      chatTheme: extractFieldWithRegex(tolerantText, 'chatTheme'),
      chatEmotions: extractFieldWithRegex(tolerantText, 'chatEmotions'),
      coreEvent: extractFieldWithRegex(tolerantText, 'coreEvent'),
      relationshipImpact: extractFieldWithRegex(tolerantText, 'relationshipImpact'),
      deepNeed: extractFieldWithRegex(tolerantText, 'deepNeed'),
    },
  };

  return hasAnyContent(result) ? result : null;
}

export function parseEndChatWorkflowResult(raw: unknown): EndChatWorkflowResult {
  try {
    const fromJson = tryParseByJsonEngine(raw);
    if (fromJson) {
      return { ...fromJson, raw };
    }

    const fromRegex = tryParseByRegexEngine(raw);
    if (fromRegex) {
      return { ...fromRegex, raw };
    }

    return { ...FALLBACK_END_CHAT_RESULT, raw };
  } catch {
    return { ...FALLBACK_END_CHAT_RESULT, raw };
  }
}
