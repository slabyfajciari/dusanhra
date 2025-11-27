//odjebat prave tlacitko
window.addEventListener('contextmenu', (e) => e.preventDefault());

// --- 1. Konfigurácia a Globálne Premenné ---
const BASE_GAME_WIDTH = 800;
const BASE_GAME_HEIGHT = 600;

// Premenné pre hru
const hracSirka = 120;
const hracVyska = 120;

// Konštanty pre kľúče zvukov v Phaser
const SOUND_KEYS = {
    SKORE: 'skore_sound',
    KONIEC: 'koniec_sound',
    ZIVOTY: 'zivoty_sound'
};

// Zoznamy zvukov (URL) pre načítanie
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

const predmetyData = [
    { name: 'hellko.png', weight: 10, health: 0, score: 1, specialEffect: null },
    { name: 'semtexik.png', weight: 20, health: 0, score: 2, specialEffect: null },
    { name: 'monstrik.png', weight: 25, health: 0, score: 1, specialEffect: 'boost' },
    { name: 'didlo.png', weight: 5, health: 1, score: 2, specialEffect: null },
    { name: 'zuvak.png', weight: 15, health: 0, score: 1, specialEffect: null },
    { name: 'hhc.png', weight: 15, health: 0, score: 1, specialEffect: 'slow' },
    { name: 'dusan_green_apple_.png', weight: 10, health: 0, score: 1, specialEffect: 'invert' }
];


class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });

        // Herný stav
        this.hrac = null;
        this.predmeti = null;
        this.skore = 0;
        this.zivoty = 3;
        this.bestScore = 0;
        this.hraBezi = false;
        this.activeSpecialEffect = null;
        this.rychlostPadania = 4;
        this.intervalVytvarania = 1000;
        this.dalsiLevelSkore = 10;
        this.spawner = null;
        this.isShaking = false;
        this.shakeTimer = 0;
        this.shakeDuration = 0;

        // UI & Input
        this.skoreText = null;
        this.zivotyText = null;
        this.bestScoreText = null;
        this.tlacidloStart = null;
        this.gameOverScreenContainer = null;
        this.submitButtonPhaser = null;
        this.playAgainButtonPhaser = null;
        this.nameInput = document.getElementById('nameInput');

        // Zvuky
        this.skoreSoundKeys = [];
        this.koniecSoundKeys = [];
        this.zivotySoundKeys = [];
    }

    preload() {
        this.load.image('pozadie', 'assets/pozadie.png');
        this.load.image('hrac', 'assets/dusan.png');

        predmetyData.forEach(p => {
            this.load.image(p.name, 'assets/predmety/' + p.name);
        });

        this.loadSounds(skoreSounds, SOUND_KEYS.SKORE, this.skoreSoundKeys);
        this.loadSounds(koniecSounds, SOUND_KEYS.KONIEC, this.koniecSoundKeys);
        this.loadSounds(zivotySounds, SOUND_KEYS.ZIVOTY, this.zivotySoundKeys);
    }

    loadSounds(urlList, baseKey, keyArray) {
        urlList.forEach((url, index) => {
            const key = `${baseKey}_${index}`;
            this.load.audio(key, url);
            keyArray.push(key);
        });
    }

    create() {
        console.log('Camera main exists:', this.cameras.main);
        console.log('Cameras object:', this.cameras);
        this.sound.volume = 0.5;
        this.setupScaling();
        this.loadBestScore();

        const pozadie = this.add.image(BASE_GAME_WIDTH / 2, BASE_GAME_HEIGHT / 2, 'pozadie');
        pozadie.displayWidth = BASE_GAME_WIDTH;
        pozadie.displayHeight = BASE_GAME_HEIGHT;

        this.hrac = this.physics.add.sprite(BASE_GAME_WIDTH / 2, BASE_GAME_HEIGHT - hracVyska / 2 - 10, 'hrac');
        this.hrac.displayWidth = hracSirka;
        this.hrac.displayHeight = hracVyska;
        this.hrac.setCollideWorldBounds(true);
        this.hrac.body.allowGravity = false;

        this.predmeti = this.physics.add.group({ runChildUpdate: true });

        const textStyle = { fontFamily: 'Arial', fontSize: 24, color: '#ffffff' };
        this.skoreText = this.add.text(10, 10, 'Skore: 0', textStyle);
        this.bestScoreText = this.add.text(10, 40, 'Najlepsie: ' + this.bestScore, textStyle);
        this.zivotyText = this.add.text(BASE_GAME_WIDTH - 10, 10, 'Zivoty: 3', textStyle).setOrigin(1, 0);

        this.createUIs();

        this.physics.add.overlap(this.hrac, this.predmeti, this.hitPredmet, this.checkCustomCollision, this);
        this.input.on('pointermove', this.handlePlayerMovement, this);
        this.vytvorStartTlacitko();
    }

    update(time, delta) {
        if (!this.hraBezi) return;

        this.handleScreenShake(time);

        this.predmeti.children.each(predmet => {
            if (!predmet.active || !predmet.body) return; // bezpečnostná kontrola

            predmet.y += this.rychlostPadania * (delta / 16.666);

            if (predmet.y > BASE_GAME_HEIGHT + 50) {
                this.handleMissedItem(predmet);
            }
        });
    }

    handlePlayerMovement(pointer) {
        if (!this.hraBezi) return;
        if (!this.hrac || !this.hrac.body) return;

        let x = pointer.x;

        if (this.activeSpecialEffect === 'invert') {
            x = BASE_GAME_WIDTH - x;
        }

        this.hrac.x = Phaser.Math.Clamp(
            x,
            hracSirka / 2,
            BASE_GAME_WIDTH - hracSirka / 2
        );
    }

    checkCustomCollision(hrac, predmet) {
        // Jednoduchá kontrola pomocou Phaser fyziky
        if (!hrac || !predmet || !hrac.body || !predmet.body) {
            return false;
        }

        // Použite vstavanú kolíznu detekciu
        return this.physics.world.intersects(hrac.body, predmet.body);
    }

    hitPredmet(hrac, predmet) {
        // Rozsiahle kontroly
        if (!this.hraBezi || !hrac || !predmet) return;
        if (!predmet.active || !predmet.body) return;

        // Bezpečné získanie dát predmetu
        const predmetData = predmetyData.find(p => p.name === predmet.texture?.key);
        if (!predmetData) return;

        // Bezpečné odstránenie predmetu
        try {
            predmet.disableBody(true, true);
        } catch (e) {
            console.warn('Chyba pri odstraňovaní predmetu:', e);
            predmet.destroy();
        }

        // Aktualizácia skóre a životov
        this.skore += predmetData.score || 1;
        this.skoreText.setText('Skore: ' + this.skore);

        if (predmetData.health && this.zivoty < 6) {
            this.zivoty += predmetData.health;
            this.zivotyText.setText('Zivoty: ' + this.zivoty);
            this.playZivoty();
        }

        this.playSkore();
        if (this.skore >= this.dalsiLevelSkore) this.zvysObtiaznost();
        this.handleSpecialEffect(predmetData.specialEffect);
    }


    handleMissedItem(predmet) {
        if (!predmet || !predmet.active) return;

        this.zivoty--;
        this.shakeScreen(200);
        this.zivotyText.setText('Zivoty: ' + this.zivoty);
        this.playZivoty();

        // Bezpečné odstránenie predmetu
        if (predmet.body) {
            predmet.disableBody(true, true);
        } else {
            predmet.destroy();
        }

        if (this.zivoty <= 0) this.gameOver();
    }

    handleScreenShake(time) {
        if (!this.isShaking || !this.cameras || !this.cameras.main) return;

        const camera = this.cameras.main;

        if (time < this.shakeTimer + this.shakeDuration) {
            camera.setScroll(
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10
            );
        } else {
            camera.setScroll(0, 0);
            this.isShaking = false;
        }
    }
    playRandomFrom(keyArray) {
        if (!keyArray || keyArray.length === 0) return;
        const index = Phaser.Math.Between(0, keyArray.length - 1);
        this.sound.play(keyArray[index]);
    }

    playSkore() { this.playRandomFrom(this.skoreSoundKeys); }
    playKoniec() { this.playRandomFrom(this.koniecSoundKeys); }
    playZivoty() { this.playRandomFrom(this.zivotySoundKeys); }

    startGame() {
        if (!this.hrac) return;
        this.sound.stopAll();
        this.hraBezi = true;
        this.skore = 0;
        this.zivoty = 3;
        this.activeSpecialEffect = null;
        this.rychlostPadania = 4;
        this.intervalVytvarania = 1000;
        this.dalsiLevelSkore = 10;

        this.skoreText.setText('Skore: ' + this.skore);
        this.zivotyText.setText('Zivoty: ' + this.zivoty);

        this.predmeti.clear(true, true);

        this.gameOverScreenContainer.setVisible(false);
        this.nameInput.style.display = 'none';
        this.tlacidloStart.setVisible(false);

        if (this.spawner) this.spawner.remove(false);
        this.spawner = this.time.addEvent({
            delay: this.intervalVytvarania,
            callback: this.vytvorPredmet,
            callbackScope: this,
            loop: true
        });
    }

    gameOver() {
        this.hraBezi = false;
        if (this.spawner) this.spawner.remove(false);
        this.playKoniec();

        this.gameOverScreenContainer.setVisible(true);
        this.saveBestScore();

        if (this.skore > this.bestScore) {
            this.playAgainButtonPhaser.setVisible(false);
            this.resizeInput();
        } else {
            this.playAgainButtonPhaser.setVisible(true);
            this.nameInput.style.display = 'none';
        }

    }

    vytvorPredmet() {
        const predmetNazov = this.vyberPredmetPodlaSance();
        const predmetDataObj = predmetyData.find(p => p.name === predmetNazov);
        if (!predmetDataObj) return;

        const polomer = 60;
        const x = Phaser.Math.RND.between(polomer, BASE_GAME_WIDTH - polomer);

        // Bezpečné vytvorenie predmetu
        const predmet = this.predmeti.create(x, -polomer, predmetNazov);

        if (!predmet) return;

        predmet.displayWidth = polomer;
        predmet.displayHeight = polomer;

        // Kontrola existencie body pred nastavením
        if (predmet.body) {
            predmet.body.setAllowGravity(false);
            predmet.body.immovable = true;
        }

        // Uloženie dát priamo do predmetu
        predmet.predmetData = predmetDataObj;
    }

    zvysObtiaznost() {
        this.rychlostPadania += 0.5;
        if (this.intervalVytvarania > 300) this.intervalVytvarania -= 75;
        if (this.spawner) this.spawner.delay = this.intervalVytvarania;
        this.dalsiLevelSkore += 5;
    }

    handleSpecialEffect(effect) {
        switch (effect) {
            case 'boost':
                this.rychlostPadania += 2;
                this.time.delayedCall(2000, () => { this.rychlostPadania = Math.max(this.rychlostPadania - 2, 2); }, [], this);
                break;
            case 'slow':
                this.rychlostPadania = Math.max(this.rychlostPadania - 2, 2);
                this.time.delayedCall(2000, () => { this.rychlostPadania += 2; }, [], this);
                break;
            case 'invert':
                this.activeSpecialEffect = 'invert';
                this.time.delayedCall(2000, () => { this.activeSpecialEffect = null; }, [], this);
                break;
        }
    }

    shakeScreen(duration) {
        if (this.isShaking) return;
        this.isShaking = true;
        this.shakeDuration = duration;
        this.shakeTimer = this.time.now;
    }

    setupScaling() {
        window.addEventListener('resize', () => this.resizeInput());
        this.resizeInput();
    }

    resizeInput() {
        const gameCanvas = this.sys.game.canvas;
        const scale = gameCanvas.style.transform.match(/scale\(([0-9.]+)\)/);
        const currentScale = scale ? parseFloat(scale[1]) : 1;

        if (this.nameInput && this.nameInput.style.display !== 'none') {
            this.nameInput.style.fontSize = `${24 * currentScale}px`;

            const inputWidth = this.nameInput.offsetWidth;
            const canvasRect = gameCanvas.getBoundingClientRect();

            this.nameInput.style.left = `${canvasRect.left + (BASE_GAME_WIDTH * currentScale / 2) - (inputWidth / 2)}px`;
            this.nameInput.style.top = `${canvasRect.top + (BASE_GAME_HEIGHT * currentScale / 2) - (140 * currentScale)}px`;
        }
    }

    vytvorStartTlacitko() {
        this.tlacidloStart = this.add.container(BASE_GAME_WIDTH / 2, BASE_GAME_HEIGHT / 2);
        const pozadieTlacitka = this.add.graphics();
        pozadieTlacitka.fillStyle(0x000000, 0.5);
        pozadieTlacitka.fillRoundedRect(-100, -30, 200, 60, 15);
        this.tlacidloStart.add(pozadieTlacitka);

        const textTlacitka = this.add.text(0, 0, 'START', { fontFamily: 'Arial', fontSize: 32, fill: '#ffffff' }).setOrigin(0.5);
        this.tlacidloStart.add(textTlacitka);

        this.tlacidloStart.setInteractive(new Phaser.Geom.Rectangle(-100, -30, 200, 60), Phaser.Geom.Rectangle.Contains);
        this.tlacidloStart.on('pointerdown', this.startGame, this);
    }

    createUIs() {
        // Vytvorenie kontajnera pre UI s VYŠŠOU HĽADKOVOU VRSTVOU
        this.gameOverScreenContainer = this.add.container(0, 0).setVisible(false).setDepth(1000); // <-- Pridané setDepth(1000)

        // Overlay - čierny polopriehľadný
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.7);
        overlay.fillRect(0, 0, BASE_GAME_WIDTH, BASE_GAME_HEIGHT);
        overlay.setDepth(999); // <-- Nastavenie hĺbky pre overlay
        this.gameOverScreenContainer.add(overlay);

        // Text GAME OVER
        this.gameOverText = this.add.text(BASE_GAME_WIDTH / 2, BASE_GAME_HEIGHT / 2 - 100, 'GAME OVER', {
            fontFamily: 'Arial', fontSize: 64, color: '#ff0000', fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(1001); // <-- Vyššia hĺbka ako overlay
        this.gameOverScreenContainer.add(this.gameOverText);

        // Tlačidlá
        this.playAgainButtonPhaser = this.createButton('HRAŤ ZNOVU', 0x008000, BASE_GAME_WIDTH / 2, BASE_GAME_HEIGHT / 2 , this.startGame.bind(this));
        this.playAgainButtonPhaser.setDepth(1001); // <-- Vyššia hĺbka
        this.gameOverScreenContainer.add(this.playAgainButtonPhaser).setVisible(false);
    }

    createButton(text, color, x, y, callback) {
        const container = this.add.container(x, y);
        const bg = this.add.graphics();
        bg.fillStyle(color);
        bg.fillRoundedRect(-100, -25, 200, 50, 10);
        container.add(bg);

        const textObj = this.add.text(0, 0, text, { fontFamily: 'Arial', fontSize: 24, fill: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
        container.add(textObj);

        container.setInteractive(new Phaser.Geom.Rectangle(-100, -25, 200, 50), Phaser.Geom.Rectangle.Contains);
        container.on('pointerdown', callback);
        return container;
    }

    loadBestScore() {
        const storedBestScore = localStorage.getItem('bestScore');
        if (storedBestScore) this.bestScore = parseInt(storedBestScore);
    }

    saveBestScore() {
        if (this.skore > this.bestScore) {
            this.bestScore = this.skore;
            localStorage.setItem('bestScore', this.bestScore);
            this.bestScoreText.setText('Najlepsie: ' + this.bestScore);
        }
    }

    vyberPredmetPodlaSance() {
        const total = predmetyData.reduce((s, p) => s + p.weight, 0);
        let r = Math.random() * total;
        for (const p of predmetyData) {
            if (r < p.weight) return p.name;
            r -= p.weight;
        }
        return predmetyData[predmetyData.length - 1].name;
    }
}

// Konfigurácia Phaser hry
const config = {
    type: Phaser.AUTO,
    width: BASE_GAME_WIDTH,
    height: BASE_GAME_HEIGHT,
    parent: 'gameContainer', // ID kontajnera v HTML
    backgroundColor: '#000000',
    scale: {
        mode: Phaser.Scale.FIT, // Zabezpečí škálovanie
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            debug: false // Nastav na true pre zobrazenie hitboxov
        }
    },
    scene: [MainScene]
};

const game = new Phaser.Game(config);