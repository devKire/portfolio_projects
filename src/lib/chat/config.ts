export const CHAT_MESSAGE_MAX_LENGTH = 10_000;
export const CHAT_EDIT_WINDOW_MS = 15 * 60 * 1000;
export const CHAT_PAGE_SIZE = 40;
export const CHAT_MAX_ATTACHMENTS = 5;
export const CHAT_MAX_FILE_SIZE = 3 * 1024 * 1024;
export const CHAT_MAX_TOTAL_ATTACHMENT_SIZE = 8 * 1024 * 1024;
export const CHAT_SYNC_INTERVAL_MS = 5_000;
export const CHAT_WORKSPACE_SYNC_INTERVAL_MS = 15_000;
export const CHAT_SCROLL_THRESHOLD_PX = 160;
export const CHAT_REACTIONS = [
  '👍',
  '❤️',
  '😂',
  '😮',
  '😢',
  '🙏',
  '🎉',
  '👀',
] as const;

export const CHAT_ATTACHMENT_ACCEPT = [
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.pdf',
  '.txt',
  '.csv',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.json',
  '.xml',
  '.log',
  '.md',
  '.zip',
].join(',');
