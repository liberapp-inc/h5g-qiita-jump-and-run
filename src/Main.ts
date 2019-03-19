enum Scene {
  Start,
  Game,
  Result
}
enum PlatformGenerationMode {
  Flat,
  SlopeAscent,
  SlopeDescent,
  LevelsAscent,
  LevelsDescnet,
  Cliff,
  Pits,
  LargePit
}

function limit(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }
  if (max < value) {
    return max;
  }
  return value;
}

function random(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min));
}

const BALL_RADIUS = 16;
const WORLD_BOTTOM = 1024;
const MAX_VELOCITY_Y = 10;
const INITIAL_VELOCITY = -7;
const GRAVITATIONAL_ACCELERATION_DEFAULT = 0.7;
const GRAVITATIONAL_ACCELERATION_ON_TAP = 0.2;

class Main extends eui.UILayer {
  private scene: Scene;
  private distance: number;

  protected createChildren(): void {
    super.createChildren();

    egret.lifecycle.addLifecycleListener(context => {});

    egret.lifecycle.onPause = () => {
      egret.ticker.pause();
    };

    egret.lifecycle.onResume = () => {
      egret.ticker.resume();
    };

    let assetAdapter = new AssetAdapter();
    egret.registerImplementation("eui.IAssetAdapter", assetAdapter);
    egret.registerImplementation("eui.IThemeAdapter", new ThemeAdapter());

    this.runGame().catch(e => {
      console.log(e);
    });
  }

  private async runGame() {
    await this.loadResource();
    this.createGameScene();
    this.addEventListener(egret.Event.ENTER_FRAME, this.enterFrame, this);
    this.addEventListener(
      egret.TouchEvent.TOUCH_BEGIN,
      this.onTouchBegin,
      this
    );
    this.addEventListener(egret.TouchEvent.TOUCH_END, this.onTouchEnd, this);
  }

  private async loadResource() {
    const loadingView = new LoadingUI();
    this.stage.addChild(loadingView);
    this.stage.removeChild(loadingView);
  }

  private loadTheme() {
    return new Promise((resolve, reject) => {
      let theme = new eui.Theme("resource/default.thm.json", this.stage);
      theme.addEventListener(
        eui.UIEvent.COMPLETE,
        () => {
          resolve();
        },
        this
      );
    });
  }

  private tapped: boolean;
  private tapping: boolean;

  private onTouchBegin(e: egret.TouchEvent) {
    this.tapped = true;
    this.tapping = true;
  }

  private onTouchEnd(e: egret.TouchEvent) {
    this.tapping = false;
  }

  private world: egret.DisplayObjectContainer;
  private cameraX: number;
  private cameraY: number;
  private colors: Array<number> = [
    0x3800fa,
    0x7700fa,
    0xb500fa,
    0xf400fa,
    0xdb8efa
  ];
  private colorGenerationIndex: number = 0;
  private lastDrawnX: number;
  private lastDrawnY: number;
  private platforms: Array<egret.Shape> = [];
  private ball: egret.Shape;
  private ballVx: number = 1;
  private ballVy: number = 0;
  private jumpCount: number = 0;

  protected createGameScene(): void {
    this.createBackground();
    this.createWorld();
    this.createCamera();
    this.createBlocks();
    this.createBall();
    this.createUI();
  }

  private enterFrame(t: number): boolean {
    // this.updateBackground();
    // this.updateWorld();
    this.updateBlocks();
    this.updateBall();
    this.updateCamera();
    this.updateUI();
    return true;
  }

  private text: egret.TextField;
  private createUI() {
    this.text = new egret.TextField();
    this.text.size = 64;
    this.text.x = 16;
    this.text.y = 16;
    this.text.text = `${this.distance}m`;
    this.addChild(this.text);
  }

  private updateUI() {
    this.text.text = `${this.distance}m`;
  }

  private createWorld() {
    this.world = new egret.DisplayObjectContainer();
    this.addChild(this.world);
  }

  private createCamera() {
    this.cameraX = -this.width;
  }

  private createBackground() {
    const bg = new egret.Shape();
    bg.x = 0;
    bg.y = 0;
    const g = bg.graphics;
    g.beginFill(0x333333);
    g.drawRect(0, 0, this.stage.stageWidth, this.stage.stageHeight);
    g.endFill();
    this.addChild(bg);
  }

  private createBall() {
    this.distance = 0;
    this.ball = new egret.Shape();
    this.ball.x = 0;
    this.ball.y = -5;
    this.ballVy = 0;
    this.ballVx = 5;
    {
      const g = this.ball.graphics;
      g.beginFill(0xffff00);
      g.drawCircle(0, 0, BALL_RADIUS);
      g.lineStyle(1.5, 0xffffff);
      g.moveTo(0, 0);
      for (let degree = 0; degree < 720; degree++) {
        const radian = (degree * Math.PI) / 180;
        const radius = (BALL_RADIUS * degree) / 720;
        const x = 0 + radius * Math.cos(radian);
        const y = 0 + radius * Math.sin(radian);
        g.lineTo(x, y);
      }
      g.endFill();
    }
    this.world.addChild(this.ball);
  }

  private updateBall() {
    this.distance = this.ball.x;
    this.ball.x += this.ballVx;
    this.ball.y += this.ballVy;
    this.ball.rotation += 30;

    let isBallOnBlock: boolean;
    const ballRect = this.ball.getTransformedBounds(this.world);
    const bottom = ballRect.bottom;
    const blockRect = new egret.Rectangle();
    this.platforms.forEach(e => {
      e.getTransformedBounds(this.world, blockRect);
      if (blockRect.intersects(ballRect)) {
        const blockCenterY = (blockRect.top + blockRect.bottom) / 2;
        if (bottom <= blockCenterY) {
          isBallOnBlock = true;
          const newY = blockRect.top - this.ball.width / 2;
          this.ballVy = Math.min((newY - this.ball.y) / 2, this.ballVy);
          if (this.ballVy < -BALL_RADIUS) {
            console.log(`DEATH ${this.ballVy}`);
          }
        }
      }
    });

    if (isBallOnBlock) {
      this.jumpCount = 0;
    } else {
      const g = this.tapping
        ? GRAVITATIONAL_ACCELERATION_ON_TAP
        : GRAVITATIONAL_ACCELERATION_DEFAULT;
      this.ballVy += g;
    }

    if ((isBallOnBlock || this.jumpCount < 2) && this.tapped) {
      this.ballVy = INITIAL_VELOCITY;
      this.ball.y += this.ballVy;
      this.jumpCount++;
    }
    this.ballVy = limit(this.ballVy, -MAX_VELOCITY_Y, MAX_VELOCITY_Y);
    this.tapped = false;
  }

  private createBlocks() {
    this.lastDrawnX = (-3 * this.width) / 2;
    this.lastDrawnY = 0;
    const len = random(100, 150);
    for (let n = 0; n < len; n++) {
      this.createBlock(0, random(-1, 1), 24);
    }
  }

  private updateBlocks() {
    this.eraseBlocksOutOfCamera();
    this.generateNewBlocks();
  }

  private eraseBlocksOutOfCamera() {
    const visibilityLeft = this.cameraX - this.width / 2;
    this.platforms = this.platforms.filter(p => {
      const r = p.x + p.width;
      const inCamera = visibilityLeft <= r;
      if (!inCamera) {
        this.world.removeChild(p);
      }
      return inCamera;
    });
  }

  private drawPlatformGenerationMode(): PlatformGenerationMode {
    const patterns = [
      PlatformGenerationMode.Flat,
      PlatformGenerationMode.SlopeDescent,
      PlatformGenerationMode.SlopeAscent,
      PlatformGenerationMode.LevelsAscent,
      PlatformGenerationMode.LevelsDescnet,
      PlatformGenerationMode.Cliff,
      PlatformGenerationMode.Pits,
      PlatformGenerationMode.LargePit
    ];
    const index = randomInt(0, patterns.length - 1);
    return patterns[index];
  }

  private generateNewBlocks() {
    const generationBorder = this.cameraX + this.width;
    while (this.lastDrawnX < generationBorder) {
      const start = new Date().getMilliseconds();

      const mode = this.drawPlatformGenerationMode();

      switch (mode) {
        case PlatformGenerationMode.Flat:
          {
            const len = random(10, 50);
            let x = 0;
            for (let n = 0; n < len; n++) {
              this.createBlock(0, random(-1, 1), 32);
            }
          }
          break;
        case PlatformGenerationMode.SlopeDescent: {
          const len = random(10, 20);
          const descent = random(7, 10);
          for (let n = 0; n < len; n++) {
            this.createBlock(0, descent / 2 + random(-1, 1), 16, false);
            this.createBlock(0, descent / 2 + random(-1, 1), 16, true);
          }
        }
        case PlatformGenerationMode.SlopeAscent:
          {
            const len = random(10, 20);
            const ascent = random(-10, -7);
            for (let n = 0; n < len; n++) {
              this.createBlock(0, ascent / 2 + random(-1, 1), 16, false);
              this.createBlock(0, ascent / 2 + random(-1, 1), 16, true);
            }
          }
          break;
        case PlatformGenerationMode.LevelsAscent:
          {
            const len = randomInt(3, 7);
            const ascent = -random(32, 48);
            for (let n = 0; n < len; n++) {
              this.createBlock(0, ascent + random(-1, 1), 96);
            }
          }
          break;
        case PlatformGenerationMode.LevelsDescnet:
          {
            const len = randomInt(1, 2);
            const descent = random(32, 48);
            for (let n = 0; n < len; n++) {
              this.createBlock(0, descent + random(-1, 1), 96);
            }
          }
          break;
        case PlatformGenerationMode.Cliff:
          this.lastDrawnX += random(150, 200);
          this.lastDrawnY += random(100, 200);
          break;
        case PlatformGenerationMode.Pits:
          {
            const len = randomInt(3, 7);
            for (let n = 0; n < len; n++) {
              this.createBlock(0, random(-5, 5), 32);
              this.lastDrawnX += 64;
            }
          }
          break;
        case PlatformGenerationMode.LargePit:
          const len = randomInt(1, 3);
          for (let i = 0; i < len; i++) {
            this.createBlock(0, randomInt(-5, 5), 32 * randomInt(1, 3));
            this.lastDrawnX += random(150, 300);
          }
          break;
      }
      const cost = new Date().getMilliseconds() - start;
      egret.log(`mode: ${mode}, cost: ${cost}`);
    }
  }

  private currentColor(changeColorAfter: boolean = false): number {
    const color = this.colors[this.colorGenerationIndex];
    if (changeColorAfter) {
      this.colorGenerationIndex =
        (this.colorGenerationIndex + 1) % this.colors.length;
    }
    return color;
  }

  private createBlock(
    xOffset: number,
    yOffset: number,
    width: number,
    changeColorAfter: boolean = true
  ) {
    const minY = (-this.height * 1) / 4;
    const maxY = (this.height * 1) / 4;
    const p = new egret.Shape();
    p.x = this.lastDrawnX + xOffset;
    p.y = limit(this.lastDrawnY + yOffset, minY, maxY);
    const h = WORLD_BOTTOM - p.y;
    const color = this.currentColor(changeColorAfter);
    p.graphics.beginFill(color);
    p.graphics.drawRect(0, 0, width, h);
    p.graphics.endFill();
    this.world.addChild(p);
    this.platforms.push(p);
    this.lastDrawnX += p.width;
    this.lastDrawnY = p.y;
  }

  private updateCamera(): void {
    this.cameraX = this.ball.x + this.width / 4;
    this.cameraY = 0;
    this.world.x = this.width / 2 - this.cameraX;
    this.world.y = this.height / 2 - this.cameraY;
  }
}
