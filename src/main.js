//odjebat prave tlacitko
window.addEventListener('contextmenu', (e) => e.preventDefault());


// --- 1. Konfigurácia a Globálne Premenné ---
const BASE_GAME_WIDTH = window.innerWidth
const BASE_GAME_HEIGHT = window.innerHeight
// Premenné pre hru
const hracSirka = 120;
const hracVyska = 120;

// Konštanty pre kľúče zvukov v Phaser
const SOUND_KEYS = {
    POZADICKO: 'pozadie_sound',
    SKORE: 'skore_sound',
    KONIEC: 'koniec_sound',
    ZIVOTY: 'zivoty_sound'
};

// Zoznamy zvukov (URL) pre načítanie
const bgSounds = ['assets/zvuky/majksprajt.mp3'];
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

// --- 2. BOOT SCENE - Preload assetov ---
class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        this.load.image('pozadie', 'assets/pozadie.png');
        this.load.image('hrac', 'assets/dusan.png');

        predmetyData.forEach(p => {
            this.load.image(p.name, 'assets/predmety/' + p.name);
        });

        this.loadSounds(skoreSounds, SOUND_KEYS.SKORE);
        this.loadSounds(koniecSounds, SOUND_KEYS.KONIEC);
        this.loadSounds(zivotySounds, SOUND_KEYS.ZIVOTY);
        this.loadSounds(bgSounds, SOUND_KEYS.POZADICKO);
    }

    loadSounds(urlList, baseKey) {
        urlList.forEach((url, index) => {
            const key = `${baseKey}_${index}`;
            this.load.audio(key, url);
        });
    }

    create() {
        this.registry.set('skoreKeys', skoreSounds.map((_, i) => `${SOUND_KEYS.SKORE}_${i}`));
        this.registry.set('koniecKeys', koniecSounds.map((_, i) => `${SOUND_KEYS.KONIEC}_${i}`));
        this.registry.set('zivotyKeys', zivotySounds.map((_, i) => `${SOUND_KEYS.ZIVOTY}_${i}`));
        this.registry.set('bgKeys', bgSounds.map((_, i) => `${SOUND_KEYS.POZADICKO}_${i}`));
        // Po načítaní všetkých assetov prejdi na MainMenuScene
        this.scene.start('MainMenuScene');
    }
}

// --- 3. MAIN MENU SCENE - Štartovacia obrazovka ---
class MainMenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainMenuScene' });
        this.bestScore = 0;
    }

    create() {
        this.cheatCode = 'kokot'; // tvoj cheat
        this.inputBuffer = ''; // kam zbieraš písmená

        // listener pre všetky klávesy
        this.input.keyboard.on('keydown', (event) => {
            const key = event.key.toLowerCase(); // malými písmenami
            this.inputBuffer += key;

            // obmedz buffer len na dĺžku cheatu
            if (this.inputBuffer.length > this.cheatCode.length) {
                this.inputBuffer = this.inputBuffer.slice(-this.cheatCode.length);
            }

            // kontrola cheatu
            if (this.inputBuffer === this.cheatCode) {
                this.activateCheat();
                this.inputBuffer = ''; // reset buffer
            }
        });
        this.loadBestScore();
        this.sound.volume = 0.5;

        // Pozadie
        const bg = this.add.image(0, 0, 'pozadie');
        bg.setOrigin(0.5, 1);
        const scaleX = this.scale.width / bg.width;
        const scaleY = this.scale.height / bg.height;
        const scale = Math.max(scaleX, scaleY);
        bg.setScale(scale);
        bg.setPosition(this.scale.width / 2, this.scale.height);

        // Nadpis
        const titleText = this.add.text(BASE_GAME_WIDTH / 2, BASE_GAME_HEIGHT / 2 - 150, 'PADAJÚCI KOKOTI', {
            fontFamily: 'Arial', fontSize: 72, color: '#ffffff', fontStyle: 'bold', stroke: '#000000', strokeThickness: 5
        }).setOrigin(0.5);

        // Najlepšie skóre
        const bestScoreText = this.add.text(BASE_GAME_WIDTH / 2, BASE_GAME_HEIGHT / 2 - 20, 'NAJLEPŠIE: ' + this.bestScore, {
            fontFamily: 'monospace', fontSize: 32, color: '#ffff00', fontStyle: 'bold'
        }).setOrigin(0.5);

        // START tlačidlo
        this.createButton('START', 0x008000, BASE_GAME_WIDTH / 2, BASE_GAME_HEIGHT / 2 + 100, () => {
            this.scene.start('GameScene');
        });
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
    activateCheat() {
        console.log('Cheat activated!');
        // tu vlož čo sa má stať, napríklad:
        // this.player.health = 999;
        // this.player.giveAllWeapons();
    }

    loadBestScore() {
        const storedBestScore = localStorage.getItem('bestScore');
        if (storedBestScore) this.bestScore = parseInt(storedBestScore);
    }
}

// --- 4. GAME SCENE - Hlavná hra ---
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });

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
        this.level = 1; // základný level
        this.bonusLevel = 0; // dočasný bonus od special efektov
        this.rotatingSpeed = 0.04;

        // UI & Input
        this.skoreText = null;
        this.zivotyText = null;
        this.bestScoreText = null;


        // Cheaty
        this.activeCheatCode = null; // tvoj cheat
        this.inputBuffer = ''; // kam zbieraš písmená

        // Zvuky
        this.skoreSoundKeys = [];
        this.koniecSoundKeys = [];
        this.zivotySoundKeys = [];
        this.pozadieSoundKeys = [];
    }

    create() {
        this.sound.volume = 0.5;
        this.loadBestScore();

        const bg = this.add.image(0, 0, 'pozadie');
        bg.setOrigin(0.5, 1); // stred X, spodok Y
        bg.brightness = 0.5;
        const scaleX = this.scale.width / bg.width;
        const scaleY = this.scale.height / bg.height;
        const scale = Math.max(scaleX, scaleY);

        bg.setScale(scale);

        bg.setPosition(this.scale.width / 2, this.scale.height);

        this.hrac = this.physics.add.sprite(BASE_GAME_WIDTH / 2, BASE_GAME_HEIGHT - hracVyska / 2 - 10, 'hrac');
        this.hrac.displayWidth = hracSirka;
        this.hrac.displayHeight = hracVyska;
        this.hrac.setCollideWorldBounds(true);
        this.hrac.body.setSize(this.hrac.displayWidth * 5, this.hrac.displayHeight * 5);
        this.hrac.body.setOffset(this.hrac.displayWidth * 0.1, this.hrac.displayHeight * 4);
        this.hrac.body.allowGravity = false;

        this.predmeti = this.physics.add.group({ runChildUpdate: true });

        const textStyle = {
            fontFamily: 'monospace', fontSize: 24, color: '#ffffff', stroke: '#000',
            strokeThickness: 3, fontStyle: 'Bold',
        };
        this.skoreText = this.add.text(10, 10, 'SKÓRE: 0', textStyle).setDepth(1);
        this.bestScoreText = this.add.text(10, 40, 'NAJLEPŠIE: ' + this.bestScore, textStyle).setDepth(1);
        this.zivotyText = this.add.text(BASE_GAME_WIDTH - 10, 10, 'ŽIVOTY: 3', textStyle).setDepth(1).setOrigin(1, 0);


        // Načítaj zvuky
        this.loadSoundsFromRegistry();

        this.physics.add.overlap(this.hrac, this.predmeti, this.hitPredmet, this.checkCustomCollision, this);
        this.input.on('pointermove', this.handlePlayerMovement, this);

        // Spusti hru okamžite
        this.startGame();
    }

    loadSoundsFromRegistry() {
        this.skoreSoundKeys = this.registry.get('skoreKeys');
        this.koniecSoundKeys = this.registry.get('koniecKeys');
        this.zivotySoundKeys = this.registry.get('zivotyKeys');
        this.pozadieSoundKeys = this.registry.get('bgKeys');
    }

    update(time, delta) {
        if (!this.hraBezi) return;
        if (this.predmeti) {
            for (let predmet of this.predmeti.getChildren()) {
                predmet.rotation += this.rotatingSpeed;
            }
        }
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
        if (!this.hraBezi || !this.hrac || !this.hrac.body) return;

        let targetX = pointer.x;

        this.hrac.x = Phaser.Math.Clamp(
            targetX,
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
        this.skoreText.setText('SKÓRE: ' + this.skore);

        if (predmetData.health && this.zivoty < 3) {
            this.zivoty += predmetData.health;
            this.zivotyText.setText('Zivoty: ' + this.zivoty);
        }

        this.playSkore();
        this.zvysObtiaznost();
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

    updateLevel() {
        // Výpočet levelu podľa skóre + bonusLevel
        let baseLevel = 1;
        if (this.skore >= 100) {
            baseLevel = 4 + Math.floor((this.skore - 100) / 25);
        } else {
            baseLevel = Math.floor(this.skore / 10) + 1;
        }

        this.level = baseLevel + this.bonusLevel;

        // Level určuje rýchlosť padania a interval spawnovania
        this.rychlostPadania = 4 + this.level; // základná rýchlosť + 0.5 za level
        this.intervalVytvarania = Math.max(1000 - this.level * 50, 300);

        if (this.spawner) {
            this.spawner.delay = this.intervalVytvarania;
        }
    }


    playRandomFrom(keyArray) {
        if (!keyArray || keyArray.length === 0) return;
        const index = Phaser.Math.Between(0, keyArray.length - 1);
        this.sound.play(keyArray[index]);
    }

    playPozadicko() {
        // Ak už hudba hrá, nepúšťaj ju znova
        if (this.bgMusic && this.bgMusic.isPlaying) return console.log('hudba uz bezi');

        // Pustíme prvý track zo zoznamu pozadia
        const key = this.pozadieSoundKeys[0];
        console.log('pustam hudbu', key);
        if (key) {
            this.bgMusic = this.sound.add(key, { loop: true, volume: 0.3 });
            this.bgMusic.play();
        }
    }
    playSkore() { this.playRandomFrom(this.skoreSoundKeys); }
    playKoniec() { this.playRandomFrom(this.koniecSoundKeys); }
    playZivoty() {
        this.playRandomFrom(this.zivotySoundKeys);
    }

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

        this.skoreText.setText('SKÓRE: ' + this.skore);
        this.zivotyText.setText('ŽIVOTY: ' + this.zivoty);

        this.predmeti.clear(true, true);

        if (this.spawner) this.spawner.remove(false);
        this.spawner = this.time.addEvent({
            delay: this.intervalVytvarania,
            callback: this.vytvorPredmet,
            callbackScope: this,
            loop: true
        });
        this.playPozadicko();
    }

    gameOver() {
        this.hraBezi = false;
        if (this.spawner) this.spawner.remove(false);
        this.playKoniec();
        this.saveBestScore();
        if (this.bgMusic) {
            this.bgMusic.stop();
        }

        // Prejdi na GameOverScene a posli dáta
        this.scene.start('GameOverScene', { skore: this.skore, bestScore: this.bestScore });
    }

    vytvorPredmet() {
        const predmetNazov = this.vyberPredmetPodlaSance();
        const predmetDataObj = predmetyData.find(p => p.name === predmetNazov);
        if (!predmetDataObj) return;

        const polomer = 60;
        const x = Phaser.Math.RND.between(polomer, BASE_GAME_WIDTH - polomer);

        // Bezpečné vytvorenie predmetu
        const predmet = this.predmeti.create(x, -polomer, predmetNazov);
        predmet.rotation = 0.01 * Phaser.Math.Between(0, 360);

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
        // Už nepočítame priamo rýchlosť alebo delay, ale prepočítame level
        this.updateLevel();
        this.dalsiLevelSkore += 10; // alebo iný progres skóre pre ďalší level
    }


    handleSpecialEffect(effect) {
        // spomalenie alebo zrýchlenie padania, invertovanie ovládania
        const bonus = 2; // levelový bonus alebo malus
        switch (effect) {
            case 'boost':
                this.activeSpecialEffect = 'boost';
                this.rotatingSpeed = 0.08;
                this.bonusLevel += bonus;
                this.updateLevel();
                this.time.delayedCall(2000, () => {
                    this.activeSpecialEffect = null;
                    this.rotatingSpeed = 0.04;
                    this.bonusLevel -= bonus;
                    this.updateLevel();
                }, [], this);
                break;
            case 'slow':
                this.activeSpecialEffect = 'slow';
                this.rotatingSpeed = 0.02;
                this.bonusLevel -= bonus;
                this.updateLevel();
                this.time.delayedCall(2000, () => {
                    this.activeSpecialEffect = null;
                    this.rotatingSpeed = 0.04;
                    this.bonusLevel += bonus;
                    this.updateLevel();
                }, [], this);
                break;
            case 'invert':
                this.activeSpecialEffect = 'invert';
                this.time.delayedCall(2000, () => {
                    this.activeSpecialEffect = null;
                }, [], this);
                break;
        }
    }

    shakeScreen(duration) {
        if (this.isShaking) return;
        this.isShaking = true;
        this.shakeDuration = duration;
        this.shakeTimer = this.time.now;
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

// --- 5. GAME OVER SCENE - Obrazovka konca hry ---
class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
        this.skore = 0;
        this.bestScore = 0;
        this.isNewRecord = false;
    }

    init(data) {
        // Prijmi dáta z GameScene
        this.skore = data.skore || 0;
        this.bestScore = data.bestScore || 0;
        this.isNewRecord = this.skore > this.bestScore;
    }

    create() {
        this.sound.volume = 0.5;

        // Pozadie
        const bg = this.add.image(0, 0, 'pozadie');
        bg.setOrigin(0.5, 1);
        const scaleX = this.scale.width / bg.width;
        const scaleY = this.scale.height / bg.height;
        const scale = Math.max(scaleX, scaleY);
        bg.setScale(scale);
        bg.setPosition(this.scale.width / 2, this.scale.height);

        // Overlay
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.7);
        overlay.fillRect(0, 0, BASE_GAME_WIDTH, BASE_GAME_HEIGHT);

        // Text GAME OVER
        const gameOverText = this.add.text(BASE_GAME_WIDTH / 2, BASE_GAME_HEIGHT / 2 - 150, 'GAME OVER', {
            fontFamily: 'Arial', fontSize: 72, color: '#ff0000', fontStyle: 'bold', stroke: '#000000', strokeThickness: 5
        }).setOrigin(0.5);

        // Skóre
        const skoreText = this.add.text(BASE_GAME_WIDTH / 2, BASE_GAME_HEIGHT / 2 - 30, 'SKÓRE: ' + this.skore, {
            fontFamily: 'monospace', fontSize: 40, color: '#ffff00', fontStyle: 'bold'
        }).setOrigin(0.5);

        // Najlepšie skóre
        let bestScoreColor = '#ffff00';
        if (this.isNewRecord) {
            bestScoreColor = '#00ff00';
        }
        const bestScoreText = this.add.text(BASE_GAME_WIDTH / 2, BASE_GAME_HEIGHT / 2 + 30, 'NAJLEPŠIE: ' + this.bestScore, {
            fontFamily: 'monospace', fontSize: 32, color: bestScoreColor, fontStyle: 'bold'
        }).setOrigin(0.5);

        // Nový rekord text
        if (this.isNewRecord) {
            const recordText = this.add.text(BASE_GAME_WIDTH / 2, BASE_GAME_HEIGHT / 2 + 80, '🏆 NOVÝ REKORD! 🏆', {
                fontFamily: 'Arial', fontSize: 32, color: '#00ff00', fontStyle: 'bold'
            }).setOrigin(0.5);
        }

        // Tlačidlá
        this.createButton('HRAŤ ZNOVU', 0x008000, BASE_GAME_WIDTH / 2 - 120, BASE_GAME_HEIGHT / 2 + 140, () => {
            this.scene.start('GameScene');
        });

        this.createButton('MENU', 0x0000ff, BASE_GAME_WIDTH / 2 + 120, BASE_GAME_HEIGHT / 2 + 140, () => {
            this.scene.start('MainMenuScene');
        });
    }

    createButton(text, color, x, y, callback) {
        const container = this.add.container(x, y);
        const bg = this.add.graphics();
        bg.fillStyle(color);
        bg.fillRoundedRect(-80, -25, 160, 50, 10);
        container.add(bg);

        const textObj = this.add.text(0, 0, text, { fontFamily: 'Arial', fontSize: 20, fill: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
        container.add(textObj);

        container.setInteractive(new Phaser.Geom.Rectangle(-80, -25, 160, 50), Phaser.Geom.Rectangle.Contains);
        container.on('pointerdown', callback);
        return container;
    }
}

// Konfigurácia Phaser hry
const config = {
    type: Phaser.AUTO,
    width: BASE_GAME_WIDTH,
    height: BASE_GAME_HEIGHT,
    parent: 'gameContainer', // ID kontajnera v HTML
    backgroundColor: '#000000',
    pixelArt: true,
    scale: {
        mode: Phaser.Scale.RESIZE, // Zabezpečí škálovanie
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 1920,
        height: 1080
    },
    physics: {
        default: 'arcade',
        arcade: {
            debug: false // Nastav na true pre zobrazenie hitboxov
        }
    },
    scene: [BootScene, MainMenuScene, GameScene, GameOverScene]
};

const game = new Phaser.Game(config);