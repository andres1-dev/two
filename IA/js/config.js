// --- GLOBAL STATE & CONFIG ---
const MODEL = 'models/gemma-3n-e4b-it';
let chats = JSON.parse(localStorage.getItem('gemma_chats') || '[]');
let currentChatId = null;
let isProcessing = false;
let lastHighlightUpdate = 0;

marked.setOptions({
    highlight: function (code, lang) {
        if (lang && hljs.getLanguage(lang)) return hljs.highlight(code, { language: lang }).value;
        return hljs.highlightAuto(code).value;
    },
    breaks: true
});
