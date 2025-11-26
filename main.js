const BASE_GAME_WIDTH = 800;
const BASE_GAME_HEIGHT = 600;
const app = new PIXI.Application({
    width: BASE_GAME_WIDTH,
    height: BASE_GAME_HEIGHT,
    backgroundColor: 0x000000
});
document.getElementById('gameContainer').appendChild(app.view);
const nameInput = document.getElementById('nameInput');

// --- 2. Príprava herných premenných ---
let hrac;
const hracSirka = 120;
const hracVyska = 120;
let predmeti = [];
let skore = 0;
let zivoty = 3;
let bestScore = 0;
Howler.volume(0.5);
const skoreSounds = [
    'https://us-tuna-sounds-files.voicemod.net/1fd241ac-fff1-448c-b460-e0ec0f5677a3-1697143226783.mp3',
    'https://us-tuna-sounds-files.voicemod.net/94acff2e-ed53-401e-a27f-e9a549f3ec92-1650268712414.mp3',
    'https://us-tuna-sounds-files.voicemod.net/9a25e861-513b-47f0-b094-a1cd27ccb31a.mp3'
];
const koniecSounds = [
    'https://us-tuna-sounds-files.voicemod.net/0febefa3-bb3c-4776-a56b-b204ae9a8ce0-1757142285045.mp3',
    'https://us-tuna-sounds-files.voicemod.net/f90e7913-2a9a-4693-9e2c-4f023385a2a7-1733791435730.mp3'
];
const zivotySounds = [
    'https://cdn.freesound.org/previews/813/813308_71257-lq.mp3',
    'https://us-tuna-sounds-files.voicemod.net/e2e3c9d8-1420-4e66-b8be-248641f22001-1658610804269.mp3',
    'https://us-tuna-sounds-files.voicemod.net/41450380-a1c2-4c55-bfae-fadce1c186c3-1738182377258.mp3'
];
const menaPredmetov = [
    'hellko.png',
    'semtexik.png',
    'monstrik.png',
    'didlo.png',
    'zuvak.png',
    'hhc.png',
    'dusan_green_apple_.png'
];
const LEADERBOARD_LIMIT = 5;

// Premenné pre texty a tlačidlá
let skoreText, zivotyText, gameOverText, bestScoreText;
let tlacidloStart;
let submitButton, playAgainButton; // Nové tlačidlá na Game Over obrazovke
let leaderboardContainer;
let gameOverScreenContainer; // Nový kontajner pre celú obrazovku Game Over
let overlay; // Nové - pre tmavé pozadie

// NOVÉ: Premenné na riadenie obtiaZnosti
let rychlostPadania;
let intervalVytvarania;
let dalsiLevelSkore;

let isShaking = false;
let shakeDuration = 0;
let shakeTimer = 0;

// Ostatné premenné
let spawner;
let skoreSound;
let zivotySound;
let hraBezi = false;
let leaderboard = [];
const LEADERBOARD_KEY = 'pixiGameLeaderboard';

function resize() {
    const scaleX = window.innerWidth / BASE_GAME_WIDTH;
    const scaleY = window.innerHeight / BASE_GAME_HEIGHT;
    const scale = Math.min(scaleX, scaleY);
    const newWidth = BASE_GAME_WIDTH * scale;
    const newHeight = BASE_GAME_HEIGHT * scale;
    app.renderer.resize(newWidth, newHeight);
    app.view.style.width = `${newWidth}px`;
    app.view.style.height = `${newHeight}px`;
    app.view.style.left = `${(window.innerWidth - newWidth) / 2}px`;
    app.view.style.top = `${(window.innerHeight - newHeight) / 2}px`;
    app.stage.scale.set(scale);
    nameInput.style.fontSize = `${24 * scale}px`;
    nameInput.style.left = `${(app.view.offsetLeft + newWidth / 2 - nameInput.offsetWidth / 2)}px`;
    nameInput.style.top = `${(app.view.offsetTop + newHeight / 2 - 140 * scale)}px`;
}


function setup() {
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);
    resize();
    const storedBestScore = localStorage.getItem('bestScore');
    if (storedBestScore) {
        bestScore = parseInt(storedBestScore);
    }
    pozadie = PIXI.Sprite.from('assets/pozadie.png');
    pozadie.width = BASE_GAME_WIDTH;
    pozadie.height = BASE_GAME_HEIGHT;
    app.stage.addChild(pozadie);
    hrac = PIXI.Sprite.from('assets/dusan.png');
    hrac.width = hracSirka;
    hrac.height = hracVyska;
    hrac.x = BASE_GAME_WIDTH / 2 - hracSirka / 2;
    hrac.y = BASE_GAME_HEIGHT - hracVyska - 10;
    app.stage.addChild(hrac);

    skoreText = new PIXI.Text('Skore: 0', { fontFamily: 'Arial', fontSize: 24, fill: 0xffFfFf });
    skoreText.x = 10;
    skoreText.y = 10;
    app.stage.addChild(skoreText);
    bestScoreText = new PIXI.Text('Najlepsie: ' + bestScore, { fontFamily: 'Arial', fontSize: 24, fill: 0xffFfFf });
    bestScoreText.x = 10;
    bestScoreText.y = 40;
    app.stage.addChild(bestScoreText);

    zivotyText = new PIXI.Text('Zivoty: 3', { fontFamily: 'Arial', fontSize: 24, fill: 0xffffff });
    zivotyText.anchor.set(1, 0);
    zivotyText.x = BASE_GAME_WIDTH - 10;
    zivotyText.y = 10;
    app.stage.addChild(zivotyText);

    // Vytvorenie vsetkých UI prvkov pre obrazovky
    createUIs();
    loadLeaderboard();
    displayLeaderboard();

    app.stage.interactive = true;
    app.stage.hitArea = app.screen;
    app.stage.on('pointermove', (event) => {
        if (!hraBezi) return;
        hrac.x = event.global.x - hracSirka;
        if (hrac.x < 0 - hracSirka / 2) hrac.x = 0 - hracSirka / 2;
        if (hrac.x > BASE_GAME_WIDTH - hracSirka / 2) hrac.x = BASE_GAME_WIDTH - hracSirka / 2;
    });
    app.ticker.add(gameLoop);
}

function playRandomFrom(list) {
    const index = Math.floor(Math.random() * list.length);
    const sound = new Howl({
        src: [list[index]],
        preload: true
    });
    sound.play();
}

function playSkore() {
    playRandomFrom(skoreSounds);
}

function playKoniec() {
    playRandomFrom(koniecSounds);
}

function playZivoty() {
    playRandomFrom(zivotySounds);
}

function createUIs() {
    // Kontajner pre celú obrazovku Game Over
    gameOverScreenContainer = new PIXI.Container();
    gameOverScreenContainer.visible = false;
    app.stage.addChild(gameOverScreenContainer);

    // Tmavý overlay
    overlay = new PIXI.Graphics();
    overlay.beginFill(0x000000, 0.7);
    overlay.drawRect(0, 0, BASE_GAME_WIDTH, BASE_GAME_HEIGHT);
    overlay.endFill();
    gameOverScreenContainer.addChild(overlay);

    // Text "GAME OVER"
    const gameOverText = new PIXI.Text('GAME OVER', { fontFamily: 'Arial', fontSize: 64, fill: 0xff0000, fontWeight: 'bold' });
    gameOverText.anchor.set(0.5);
    gameOverText.x = BASE_GAME_WIDTH / 2;
    gameOverText.y = BASE_GAME_HEIGHT / 2 - 200;
    gameOverScreenContainer.addChild(gameOverText);

    // Tlačidlo na odoslanie skore
    submitButton = new PIXI.Container();
    submitButton.x = BASE_GAME_WIDTH / 2 - 120; // Posun doľava
    submitButton.y = BASE_GAME_HEIGHT / 2 - 50;
    const submitBg = new PIXI.Graphics();
    submitBg.beginFill(0x0066ff);
    submitBg.drawRoundedRect(-100, -25, 200, 50, 10);
    submitBg.endFill();
    submitButton.addChild(submitBg);
    const submitText = new PIXI.Text('ULOZIŤ SKoRE', { fontFamily: 'Arial', fontSize: 24, fill: 0xffffff, fontWeight: 'bold' });
    submitText.anchor.set(0.5);
    submitButton.addChild(submitText);
    submitButton.interactive = true;
    submitButton.buttonMode = true;
    submitButton.on('pointertap', handleScoreSubmit);
    gameOverScreenContainer.addChild(submitButton);

    // Tlačidlo "HRAŤ ZNOVU" na Game Over obrazovke
    playAgainButton = new PIXI.Container();
    playAgainButton.x = BASE_GAME_WIDTH / 2; // Posun doprava
    playAgainButton.y = BASE_GAME_HEIGHT / 2 - 50;
    const playAgainBg = new PIXI.Graphics();
    playAgainBg.beginFill(0x008000);
    playAgainBg.drawRoundedRect(-100, -25, 200, 50, 10);
    playAgainBg.endFill();
    playAgainButton.addChild(playAgainBg);
    const playAgainText = new PIXI.Text('HRAŤ ZNOVU', { fontFamily: 'Arial', fontSize: 24, fill: 0xffffff, fontWeight: 'bold' });
    playAgainText.anchor.set(0.5);
    playAgainButton.addChild(playAgainText);
    playAgainButton.interactive = true;
    playAgainButton.buttonMode = true;
    playAgainButton.on('pointertap', startGame);
    gameOverScreenContainer.addChild(playAgainButton);
    
    // Kontajner pre zoznam leaderboardu
    leaderboardContainer = new PIXI.Container();
    leaderboardContainer.x = BASE_GAME_WIDTH / 2;
    leaderboardContainer.y = BASE_GAME_HEIGHT / 2 + 50;
    gameOverScreenContainer.addChild(leaderboardContainer);
    
    vytvorStartTlacitko();
}

function vytvorStartTlacitko() {
    tlacidloStart = new PIXI.Container();
    tlacidloStart.x = BASE_GAME_WIDTH / 2;
    tlacidloStart.y = BASE_GAME_HEIGHT / 2;
    const pozadieTlacitka = new PIXI.Graphics();
    pozadieTlacitka.beginFill(0x000000, 0.5);
    pozadieTlacitka.drawRoundedRect(-100, -30, 200, 60, 15);
    pozadieTlacitka.endFill();
    tlacidloStart.addChild(pozadieTlacitka);
    const textTlacitka = new PIXI.Text('START', { fontFamily: 'Arial', fontSize: 32, fill: 0xffffff });
    textTlacitka.anchor.set(0.5);
    tlacidloStart.addChild(textTlacitka);
    tlacidloStart.interactive = true;
    tlacidloStart.buttonMode = true;
    tlacidloStart.on('pointertap', startGame);
    app.stage.addChild(tlacidloStart);
}

function handleScoreSubmit() {
    const playerName = nameInput.value.trim();
    if (playerName !== "") {
        leaderboard.push({ name: playerName, score: skore });
        saveLeaderboard();
        displayLeaderboard();
    }
    nameInput.style.display = 'none';
    submitButton.visible = false;
    playAgainButton.visible = true; // UkáZe tlačidlo "Hrať znovu"
}

function startGame() {
    Howler.stop();
    hraBezi = true;
    skore = 0;
    zivoty = 3;
    skoreText.text = 'Skore: ' + skore;
    zivotyText.text = 'Zivoty: ' + zivoty;
    rychlostPadania = 4;
    intervalVytvarania = 1000;
    dalsiLevelSkore = 10;
    predmeti.forEach(predmet => predmet.destroy());
    predmeti = [];

    // Skryje UI
    gameOverScreenContainer.visible = false;
    nameInput.style.display = 'none';
    tlacidloStart.visible = false;

    clearInterval(spawner);
    spawner = setInterval(vytvorPredmet, intervalVytvarania);
}

function gameOver() {
    hraBezi = false;
    clearInterval(spawner);
    playKoniec();
    
    // Zobrazí celú obrazovku Game Over
    gameOverScreenContainer.visible = true;
    
    // UloZí Best Score (vZdy)
    saveBestScore();
    
    // NOVÉ: Podmienka na zobrazenie inputu
    if (skore > bestScore) {
        submitButton.visible = true;
        playAgainButton.visible = false;
        nameInput.style.display = 'block';
        nameInput.value = '';
        nameInput.focus();
    } else {
        submitButton.visible = false;
        playAgainButton.visible = true; // Zobrazí len tlačidlo Hrať znovu
        nameInput.style.display = 'none';
    }

    displayLeaderboard();
}

function saveBestScore() {
    if (skore > bestScore) {
        bestScore = skore;
        localStorage.setItem('bestScore', bestScore);
        bestScoreText.text = 'Najlepsie: ' + bestScore;
    }
}

function loadLeaderboard() {
    const storedLeaderboard = localStorage.getItem(LEADERBOARD_KEY);
    if (storedLeaderboard) {
        leaderboard = JSON.parse(storedLeaderboard);
    }
}

function saveLeaderboard() {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard));
}

function displayLeaderboard() {
    leaderboardContainer.removeChildren();
    const header = new PIXI.Text('Najlepsie skore', { fontFamily: 'Arial', fontSize: 24, fill: 0xffffff });
    header.anchor.set(0.5);
    header.y = -40;
    leaderboardContainer.addChild(header);
    const sortedLeaderboard = leaderboard.sort((a, b) => b.score - a.score).slice(0, LEADERBOARD_LIMIT);
    sortedLeaderboard.forEach((entry, index) => {
        const text = new PIXI.Text(`${index + 1}. ${entry.name}: ${entry.score}`, { fontFamily: 'Arial', fontSize: 18, fill: 0xffffff });
        text.anchor.set(0.5);
        text.y = index * 30;
        leaderboardContainer.addChild(text);
    });
}

function vytvorPredmet() {
    const predmet = PIXI.Sprite.from("assets/predmety/" + menaPredmetov[Math.floor(Math.random() * menaPredmetov.length)]);
    const polomer = 60;
    predmet.width = polomer;
    predmet.height = polomer;
    predmet.x = Math.random() * (BASE_GAME_WIDTH - polomer * 2) + polomer;
    predmet.y = -polomer;
    app.stage.addChild(predmet);
    predmeti.push(predmet);
}

function shakeScreen(duration) {
    if (isShaking) return;
    isShaking = true;
    shakeDuration = duration;
    shakeTimer = Date.now();
}

function zvysObtiaznost() {
    rychlostPadania += 0.5;
    if (intervalVytvarania > 300) {
        intervalVytvarania -= 75;
    }
    clearInterval(spawner);
    spawner = setInterval(vytvorPredmet, intervalVytvarania);
    dalsiLevelSkore += 5;
}

function gameLoop(delta) {
    if (!hraBezi) return;
    if (isShaking) {
        if (Date.now() - shakeTimer < shakeDuration) {
            app.stage.x = (Math.random() - 0.5) * 10;
            app.stage.y = (Math.random() - 0.5) * 10;
        } else {
            app.stage.x = 0;
            app.stage.y = 0;
            isShaking = false;
        }
    }
    for (let i = predmeti.length - 1; i >= 0; i--) {
        const predmet = predmeti[i];
        predmet.y += rychlostPadania * delta;
        if (zistilaSaKolizia(hrac, predmet)) {
            skore++;
            skoreText.text = 'Skore: ' + skore;
            playSkore();
            if (skore >= dalsiLevelSkore) {
                zvysObtiaznost();
            }
            app.stage.removeChild(predmet);
            predmeti.splice(i, 1);
        } else if (predmet.y > BASE_GAME_HEIGHT + 50) {
            zivoty--;
            shakeScreen(200);
            zivotyText.text = 'Zivoty: ' + zivoty;
            playZivoty();
            app.stage.removeChild(predmet);
            predmeti.splice(i, 1);
            if (zivoty <= 0) {
                gameOver();
            }
        }
    }
}

function zistilaSaKolizia(objektA, objektB) {
    const a = objektA.getBounds();
    const b = objektB.getBounds();
    const hitboxVyska = 70;
    const posunY = a.height - hitboxVyska;
    const a_hitbox = {
        x: a.x,
        y: a.y + posunY,
        width: a.width,
        height: hitboxVyska
    };
    return a_hitbox.x + a_hitbox.width > b.x &&
        a_hitbox.x < b.x + b.width &&
        a_hitbox.y + a_hitbox.height > b.y &&
        a_hitbox.y < b.y + b.height;
}

setup();