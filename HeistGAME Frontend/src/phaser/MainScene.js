import Phaser from 'phaser';

const PLAYER_POSITIONS = [
    { x: -198, y: 191 },
    { x: -19, y: 242 },
    { x: 133, y: 134 },
    { x: 301, y: 123 },
    { x: 215, y: -17 },
    { x: 89, y: -76 },
    { x: -99, y: -47 },
    { x: -235, y: 40 },
];

export class MainScene extends Phaser.Scene {
   constructor(onReadyCallback) {
    super({ key: 'MainScene' });
    this.playerSpriteGroup = null;
    this.playerNameTextGroup = null;
    // Store the passed-in function so we can call it later.
    this.onReady = onReadyCallback;
  }

  preload() {
    this.load.image('background', 'assets/background2.png');

    // NEW: Loop and load 8 individual WebP files
    for (let i = 1; i <= 8; i++) {
        const charKey = `char${i}`;
        // Load each image with its unique key (e.g., 'char1', 'char2')
        this.load.image(charKey, `assets/${charKey}.webp`);
    }
  }

  create() {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    const bg = this.add.image(centerX, centerY, 'background');
    bg.setDepth(-1);

    this.playerSpriteGroup = this.add.group();
    this.playerNameTextGroup = this.add.group();

    /*
    // --- DEBUG: Coordinate Finder ---
    // To find new coordinates, enable this code, run the game, and click on the screen.
    // The coordinates relative to the center will be logged to the browser's console.
    this.input.on('pointerdown', (pointer) => {
        const relativeX = Math.round(pointer.x - centerX);
        const relativeY = Math.round(pointer.y - centerY);
        console.log(`{ x: ${relativeX}, y: ${relativeY} },`);
    });
    */

    // NEW: Signal to React that the scene is fully created and ready
    if (this.onReady) {
      this.onReady();
    }
  }

  updatePlayerVisuals(players, mastermindId) {

    // If the sprite group hasn't been created yet, do nothing.
    if (!this.playerSpriteGroup || !this.playerNameTextGroup) {
      return;
    }
    
    this.playerSpriteGroup.clear(true, true);
    this.playerNameTextGroup.clear(true, true);

    if (players.length === 0) return;

    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    players.forEach((player, index) => {
      // Don't try to render if the character key hasn't been assigned or loaded
      if (!player.character || !this.textures.exists(player.character)) {
        return;
      }
      if (index >= PLAYER_POSITIONS.length) return;

      const position = PLAYER_POSITIONS[index];
      const x = centerX + position.x;
      const y = centerY + position.y;

      // NEW: Use the player.character string (e.g., "char1") as the texture key
      const sprite = this.playerSpriteGroup.create(x, y, player.character);
      
      sprite.setScale(0.3);
      sprite.setAlpha(1.0); // Reset alpha
      sprite.clearTint(); // Reset tint
      
      if (player.uid === mastermindId) {
        sprite.setTint(0xfacc15);
        sprite.setScale(0.3);
      }

      // --- Add Player Name Text ---
      // Position the name above the sprite, based on the sprite's scaled height.
      // The extra 10 pixels provide a small margin.
      const nameY = y - (sprite.displayHeight / 2) - 10;
      const nameText = this.add.text(x, nameY, player.displayName, {
        fontFamily: 'VT323',
        fontSize: '22px',
        color: '#ffffff',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 4,
      }).setOrigin(0.5);

      this.playerNameTextGroup.add(nameText);

      // Style the name to match the player status
      if (player.uid === mastermindId) {
        nameText.setColor('#facc15'); // Yellow color for mastermind
      }

      // NEW: Apply a visual effect if the player is offline
      if (!player.isOnline) {
        sprite.setTint(0x555555); // Grey tint will override mastermind tint
        sprite.setAlpha(0.6);
        nameText.setColor('#999999'); // Grey out the name as well
        nameText.setAlpha(0.6);
      }
    });
  }
}