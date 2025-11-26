// DOM Elements
const boardElement = document.getElementById('chessboard');
const statusElement = document.getElementById('connection-status');
const turnText = document.getElementById('turn-text');
const turnDot = document.getElementById('turn-dot');
const gameMessage = document.getElementById('game-message');
const restartBtn = document.getElementById('restart-btn');
const flipBtn = document.getElementById('flip-btn');
const hostBtn = document.getElementById('host-btn');
const joinBtn = document.getElementById('join-btn');
const myIdDisplay = document.getElementById('my-id-display');
const myIdCode = document.getElementById('my-id');
const copyBtn = document.getElementById('copy-btn');
const peerIdInput = document.getElementById('peer-id-input');

// Game State
let board = [];
let turn = 'w'; // 'w' or 'b'
let myColor = 'w'; // 'w' (Host) or 'b' (Joiner) or 'both' (Local)
let isMultiplayer = false;
let selectedSquare = null;
let validMoves = [];
let castlingRights = { w: { k: true, q: true }, b: { k: true, q: true } };
let enPassantTarget = null;
let isFlipped = false;

// PeerJS
let peer = null;
let conn = null;

// Assets
const PIECE_SVGS = {
    w: {
        p: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg',
        r: 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg',
        n: 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg',
        b: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg',
        q: 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg',
        k: 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg'
    },
    b: {
        p: 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg',
        r: 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg',
        n: 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg',
        b: 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg',
        q: 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg',
        k: 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg'
    }
};

// --- Initialization ---

function initGame(online = false, color = 'w') {
    // Standard starting position
    board = [
        ['br', 'bn', 'bb', 'bq', 'bk', 'bb', 'bn', 'br'],
        ['bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp'],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        ['wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp'],
        ['wr', 'wn', 'wb', 'wq', 'wk', 'wb', 'wn', 'wr']
    ];

    turn = 'w';
    castlingRights = { w: { k: true, q: true }, b: { k: true, q: true } };
    enPassantTarget = null;
    selectedSquare = null;
    validMoves = [];

    isMultiplayer = online;
    myColor = online ? color : 'both';

    // Auto-flip for black
    if (myColor === 'b') {
        isFlipped = true;
        boardElement.classList.add('flipped');
    } else {
        isFlipped = false;
        boardElement.classList.remove('flipped');
    }

    updateUI();
    renderBoard();
    gameMessage.innerText = isMultiplayer ? "Partida Online Iniciada" : "Partida Local Iniciada";
}

// --- Networking (PeerJS) ---

function generateShortId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function initPeer(isHost = false) {
    // If host, try to use a short ID. If joiner, let PeerJS assign one.
    const options = isHost ? { debug: 2 } : { debug: 2 };

    if (isHost) {
        const id = generateShortId();
        peer = new Peer(id, options);
    } else {
        peer = new Peer(undefined, options);
    }

    peer.on('open', (id) => {
        if (isHost) {
            myIdCode.innerText = id;
            myIdDisplay.classList.remove('hidden');
            hostBtn.disabled = true;
            statusElement.innerText = "Esperando rival...";
            statusElement.className = "status-indicator disconnected";
        }
    });

    peer.on('connection', (c) => {
        handleConnection(c);
    });

    peer.on('error', (err) => {
        console.error(err);
        if (err.type === 'peer-unavailable') {
            statusElement.innerText = "ID no encontrado";
            statusElement.className = "status-indicator disconnected";
            alert("Error: El ID ingresado no existe o el usuario no está conectado.");
        } else if (err.type === 'unavailable-id') {
            // Retry with new ID if collision (rare)
            if (isHost) {
                peer.destroy();
                initPeer(true);
            }
        } else {
            alert("Error de conexión: " + err.type);
        }
    });
}

function handleConnection(c) {
    conn = c;
    statusElement.innerText = "Conectando...";
    statusElement.className = "status-indicator";

    conn.on('data', (data) => {
        console.log('Received:', data);
        if (data.type === 'move') {
            executeMove(data.move, false);
        } else if (data.type === 'start') {
            statusElement.innerText = "Conectado con Anfitrión";
            statusElement.className = "status-indicator connected";
            initGame(true, 'b'); // I joined, I am Black
        } else if (data.type === 'join') {
            statusElement.innerText = "Rival Conectado";
            statusElement.className = "status-indicator connected";
            // Send start to joiner
            conn.send({ type: 'start' });
            initGame(true, 'w'); // I am Host, I am White
        }
    });

    conn.on('open', () => {
        // If I initiated the connection (Joiner), send 'join'
        if (conn.peer === peerIdInput.value) {
            conn.send({ type: 'join' });
            statusElement.innerText = "Esperando respuesta...";
        }
    });

    conn.on('close', () => {
        statusElement.innerText = "Desconectado";
        statusElement.className = "status-indicator disconnected";
        alert("Rival desconectado");
    });
}

hostBtn.addEventListener('click', () => {
    initPeer(true);
});

joinBtn.addEventListener('click', () => {
    const destId = peerIdInput.value.toUpperCase(); // Ensure uppercase match
    if (!destId) return alert("Ingresa un ID");

    statusElement.innerText = "Buscando...";

    // If peer not initialized, init it first
    if (!peer || peer.destroyed) {
        initPeer(false);
        peer.on('open', () => {
            conn = peer.connect(destId);
            handleConnection(conn);
        });
    } else {
        conn = peer.connect(destId);
        handleConnection(conn);
    }
});

copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(myIdCode.innerText);
    alert("ID Copiado!");
});

// --- Game Logic ---

function renderBoard() {
    boardElement.innerHTML = '';

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            square.classList.add('square');
            square.classList.add((row + col) % 2 === 0 ? 'light' : 'dark');
            square.dataset.row = row;
            square.dataset.col = col;

            const pieceCode = board[row][col];
            if (pieceCode) {
                const piece = document.createElement('div');
                piece.classList.add('piece');
                const color = pieceCode[0];
                const type = pieceCode[1];
                piece.style.backgroundImage = `url('${PIECE_SVGS[color][type]}')`;
                square.appendChild(piece);
            }

            // Highlight selected
            if (selectedSquare && selectedSquare.row === row && selectedSquare.col === col) {
                square.classList.add('selected');
            }

            // Highlight valid moves
            const move = validMoves.find(m => m.row === row && m.col === col);
            if (move) {
                if (board[row][col]) {
                    square.classList.add('valid-capture');
                } else {
                    square.classList.add('valid-move');
                }
            }

            square.addEventListener('click', handleSquareClick);
            boardElement.appendChild(square);
        }
    }
}

function handleSquareClick(e) {
    // Check turn and color
    if (isMultiplayer && turn !== myColor) return;

    const square = e.target.closest('.square');
    if (!square) return;

    const row = parseInt(square.dataset.row);
    const col = parseInt(square.dataset.col);

    // If a square is already selected, check if we are moving there
    if (selectedSquare) {
        const move = validMoves.find(m => m.row === row && m.col === col);
        if (move) {
            executeMove(move, true); // true = send move
            return;
        }
    }

    // Select a piece
    const piece = board[row][col];
    if (piece && piece[0] === turn) {
        // Allow selection only if it's my pieces (or local game)
        if (isMultiplayer && piece[0] !== myColor) return;

        selectedSquare = { row, col };
        validMoves = getValidMoves(row, col, piece);
        renderBoard();
    } else {
        selectedSquare = null;
        validMoves = [];
        renderBoard();
    }
}

function getValidMoves(row, col, piece) {
    const moves = [];
    const color = piece[0];
    const type = piece[1];

    const addMove = (r, c) => {
        if (r >= 0 && r < 8 && c >= 0 && c < 8) {
            const target = board[r][c];
            if (!target || target[0] !== color) {
                moves.push({ row: r, col: c });
                return !!target;
            }
        }
        return true;
    };

    if (type === 'p') {
        const direction = color === 'w' ? -1 : 1;
        const startRow = color === 'w' ? 6 : 1;

        if (!board[row + direction][col]) {
            moves.push({ row: row + direction, col: col });
            if (row === startRow && !board[row + direction * 2][col]) {
                moves.push({ row: row + direction * 2, col: col, isDouble: true });
            }
        }

        [[direction, -1], [direction, 1]].forEach(([dr, dc]) => {
            const tr = row + dr;
            const tc = col + dc;
            if (tr >= 0 && tr < 8 && tc >= 0 && tc < 8) {
                const target = board[tr][tc];
                if (target && target[0] !== color) {
                    moves.push({ row: tr, col: tc });
                }
                if (enPassantTarget && enPassantTarget.row === tr && enPassantTarget.col === tc) {
                    moves.push({ row: tr, col: tc, isEnPassant: true });
                }
            }
        });
    } else if (type === 'n') {
        [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]
            .forEach(([dr, dc]) => addMove(row + dr, col + dc));
    } else if (type === 'k') {
        [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]
            .forEach(([dr, dc]) => addMove(row + dr, col + dc));
    } else {
        const directions = [];
        if (type === 'b' || type === 'q') directions.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
        if (type === 'r' || type === 'q') directions.push([-1, 0], [1, 0], [0, -1], [0, 1]);

        directions.forEach(([dr, dc]) => {
            let r = row + dr;
            let c = col + dc;
            while (r >= 0 && r < 8 && c >= 0 && c < 8) {
                if (addMove(r, c)) break;
                r += dr;
                c += dc;
            }
        });
    }

    return moves.filter(move => !moveLeavesKingInCheck(row, col, move, color));
}

function moveLeavesKingInCheck(fromRow, fromCol, move, color) {
    const tempBoard = board.map(r => [...r]);
    tempBoard[move.row][move.col] = tempBoard[fromRow][fromCol];
    tempBoard[fromRow][fromCol] = null;

    let kingPos;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (tempBoard[r][c] === color + 'k') {
                kingPos = { r, c };
                break;
            }
        }
    }
    return isSquareAttacked(kingPos.r, kingPos.c, color, tempBoard);
}

function isSquareAttacked(row, col, color, currentBoard) {
    const enemyColor = color === 'w' ? 'b' : 'w';
    const enemyPawnDir = color === 'w' ? -1 : 1;

    if (isValid(row + enemyPawnDir, col - 1) && currentBoard[row + enemyPawnDir][col - 1] === enemyColor + 'p') return true;
    if (isValid(row + enemyPawnDir, col + 1) && currentBoard[row + enemyPawnDir][col + 1] === enemyColor + 'p') return true;

    const knightOffsets = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
    for (const [dr, dc] of knightOffsets) {
        if (isValid(row + dr, col + dc) && currentBoard[row + dr][col + dc] === enemyColor + 'n') return true;
    }

    const kingOffsets = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
    for (const [dr, dc] of kingOffsets) {
        if (isValid(row + dr, col + dc) && currentBoard[row + dr][col + dc] === enemyColor + 'k') return true;
    }

    const straightDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of straightDirs) {
        let r = row + dr;
        let c = col + dc;
        while (isValid(r, c)) {
            const p = currentBoard[r][c];
            if (p) {
                if (p === enemyColor + 'r' || p === enemyColor + 'q') return true;
                break;
            }
            r += dr;
            c += dc;
        }
    }

    const diagDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    for (const [dr, dc] of diagDirs) {
        let r = row + dr;
        let c = col + dc;
        while (isValid(r, c)) {
            const p = currentBoard[r][c];
            if (p) {
                if (p === enemyColor + 'b' || p === enemyColor + 'q') return true;
                break;
            }
            r += dr;
            c += dc;
        }
    }

    return false;
}

function isValid(r, c) {
    return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function executeMove(move, isLocal) {
    const piece = board[selectedSquare ? selectedSquare.row : move.fromRow][selectedSquare ? selectedSquare.col : move.fromCol];

    // If receiving move, we need to reconstruct 'selectedSquare' context or pass it in move data
    // Let's standardize move object for network: { fromRow, fromCol, row, col, isEnPassant, isDouble }

    let fromRow, fromCol;
    if (isLocal) {
        fromRow = selectedSquare.row;
        fromCol = selectedSquare.col;

        // Send move if multiplayer
        if (isMultiplayer && conn) {
            conn.send({
                type: 'move',
                move: {
                    fromRow, fromCol,
                    row: move.row, col: move.col,
                    isEnPassant: move.isEnPassant,
                    isDouble: move.isDouble
                }
            });
        }
    } else {
        fromRow = move.fromRow;
        fromCol = move.fromCol;
        // piece is at fromRow, fromCol
    }

    const movingPiece = board[fromRow][fromCol];

    if (move.isEnPassant) {
        board[fromRow][move.col] = null;
    }

    board[move.row][move.col] = movingPiece;
    board[fromRow][fromCol] = null;

    if (movingPiece[1] === 'p' && (move.row === 0 || move.row === 7)) {
        board[move.row][move.col] = movingPiece[0] + 'q';
    }

    if (move.isDouble) {
        enPassantTarget = { row: (fromRow + move.row) / 2, col: move.col };
    } else {
        enPassantTarget = null;
    }

    turn = turn === 'w' ? 'b' : 'w';
    selectedSquare = null;
    validMoves = [];

    updateUI();
    renderBoard();
    checkGameStatus();
}

function checkGameStatus() {
    if (isCheckmate()) {
        gameMessage.innerText = `Jaque Mate! Ganan las ${turn === 'w' ? 'Negras' : 'Blancas'}`;
    } else if (isStalemate()) {
        gameMessage.innerText = 'Tablas (Ahogado)';
    } else if (isInCheck()) {
        gameMessage.innerText = '¡Jaque!';
    } else {
        gameMessage.innerText = '';
    }
}

function updateUI() {
    turnText.innerText = turn === 'w' ? 'Turno: Blancas' : 'Turno: Negras';
    turnDot.className = `dot ${turn === 'w' ? 'white-turn' : 'black-turn'}`;
}

function isInCheck() {
    let kingPos;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (board[r][c] === turn + 'k') {
                kingPos = { r, c };
                break;
            }
        }
    }
    return isSquareAttacked(kingPos.r, kingPos.c, turn, board);
}

function hasLegalMoves() {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (board[r][c] && board[r][c][0] === turn) {
                if (getValidMoves(r, c, board[r][c]).length > 0) return true;
            }
        }
    }
    return false;
}

function isCheckmate() {
    return isInCheck() && !hasLegalMoves();
}

function isStalemate() {
    return !isInCheck() && !hasLegalMoves();
}

restartBtn.addEventListener('click', () => initGame(false));
flipBtn.addEventListener('click', () => {
    isFlipped = !isFlipped;
    boardElement.classList.toggle('flipped');
});

// Start local game by default
initGame();
