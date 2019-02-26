
enum PlatformGenerationMode {
    Flat,
    SlopeAscent,
    SlopeDescent,
    LevelsAscent,
    LevelsDescnet,
    Cliff,
    Pits,
    LargePit,
}

function random(min:number,max:number) {
    return min + Math.random() * (max -min);
}

class Main extends eui.UILayer {


    protected createChildren(): void {
        super.createChildren();

        egret.lifecycle.addLifecycleListener((context) => {
        })

        egret.lifecycle.onPause = () => {
            egret.ticker.pause();
        }

        egret.lifecycle.onResume = () => {
            egret.ticker.resume();
        }

        let assetAdapter = new AssetAdapter();
        egret.registerImplementation("eui.IAssetAdapter", assetAdapter);
        egret.registerImplementation("eui.IThemeAdapter", new ThemeAdapter());


        this.runGame().catch(e => {
            console.log(e);
        })
    }

    private async runGame() {
        await this.loadResource()
        this.createGameScene();
        this.addEventListener(egret.Event.ENTER_FRAME, this.enterFrame, this);
        this.addEventListener(egret.TouchEvent.TOUCH_BEGIN, this.tap, this);
    }

    private async loadResource() {
        const loadingView = new LoadingUI();
        this.stage.addChild(loadingView);
        this.stage.removeChild(loadingView);
    }

    private loadTheme() {
        return new Promise((resolve, reject) => {
            let theme = new eui.Theme("resource/default.thm.json", this.stage);
            theme.addEventListener(eui.UIEvent.COMPLETE, () => {
                resolve();
            }, this);
        })
    }


    private world : egret.DisplayObjectContainer;
    private cameraX: number;
    private colors: Array<number> = [0xbbbbbb,0x660000];
    private generationIndex: number = 0;
    private lastDrawnX: number;
    private lastDrawnY: number;
    private platforms: Array<egret.Shape> = [];
    private ball: egret.Shape;
    private tapped: boolean;
    private ballVx : number = 1;
    private ballVy : number = 0;
    private jumpCount : number = 0;

    protected createGameScene(): void {
        this.world = new egret.DisplayObjectContainer();
        this.addChild(this.world);

        this.cameraX = - this.width; 
        this.lastDrawnX  = this.cameraX  - this.width / 2;  
        this.lastDrawnY = 0;

        this.createBall();
    }

    private enterFrame(t:number):boolean {

        this.updateBlocks();  
        this.updateBall();
        this.updateCamera();
        return true;
    }

    private createBall() {
        this.ball = new egret.Shape();
        this.ball.x = 0;
        this.ball.y = -5;
        this.ballVy = 0;
        this.ballVx = 3;
        {
            const g = this.ball.graphics;
            g.beginFill(0xcccc00);
            g.drawCircle(0, -16, 16);
            g.endFill();
        }
        this.world.addChild(this.ball);
    }

    private updateBlocks() {
        this.eraseBlocksOutOfCamera();
        this.generateNewBlocks();  
    }

    private updateBall() {        
        this.ball.x += this.ballVx;
        this.ball.y += this.ballVy;

        let isBallOnBlock: boolean;
        const ballRect = this.ball.getTransformedBounds(this.world);
        const bottom = this.ball.y;
        const blockRect= new egret.Rectangle();
        this.platforms.forEach(e => {
            e.getTransformedBounds(this.world,blockRect);
            if (blockRect.intersects(ballRect)) {
                const blockCenterY = (blockRect.top + blockRect.bottom) / 2;
                if (bottom <= blockCenterY) {
                    isBallOnBlock = true;
                    this.ball.y = blockRect.top;
                    this.ballVy = 0;
                }
            }
        });

        if (isBallOnBlock) {
            this.jumpCount = 0;
        } else {
            this.ballVy += 0.15;
        }
        if ((isBallOnBlock || this.jumpCount < 2) && this.tapped) {
            this.ballVy -= 5;
            this.jumpCount ++;
        }  
        this.tapped = false;
    }

    private eraseBlocksOutOfCamera() {
        const visibilityLeft = this.cameraX - this.width / 2;
        this.platforms = this.platforms.filter((p) => {
            const r = p.x + p.width;
            const inCamera = visibilityLeft <= r;
            if (!inCamera) {
                this.world.removeChild(p);
            }
            return inCamera;
        });
    }

    private drawPlatformGenerationMode() : PlatformGenerationMode{
        const patterns = [PlatformGenerationMode.Flat,PlatformGenerationMode.SlopeDescent,PlatformGenerationMode.SlopeAscent];
        return patterns[this.generationIndex % 3];
    }

    private nextColor() : number {
        const c = this.colors[this.generationIndex % 2];
        this.generationIndex++;;
        return c;
    }

    private generateNewBlocks() {
        const generationBorder = this.cameraX + this.width;
        while(this.lastDrawnX  < generationBorder) {

            switch(this.drawPlatformGenerationMode()) {
                case PlatformGenerationMode.Flat:
                {
                    const len = random(3,10);
                    let x = 0;
                    for (let n = 0; n < len; n++) {
                        const p = new egret.Shape();
                        p.x = this.lastDrawnX;
                        p.y = this.lastDrawnY + random(-5,5);
                        p.graphics.beginFill(this.nextColor());
                        p.graphics.drawRect(0, 0, 32,32);
                        p.graphics.endFill();
                        this.world.addChild(p);
                        this.platforms.push(p);
                        this.lastDrawnX += p.width;
                        this.lastDrawnY = p.y;
                    }
                }
                break;
                case PlatformGenerationMode.SlopeDescent:
                {
                    const len = random(10,30);
                    const descent = random(7,10);
                    let x = 0;
                    for (let n = 0; n < len; n++) {
                        const p = new egret.Shape();
                        p.x = this.lastDrawnX;
                        p.y = this.lastDrawnY + descent + random(-5,5);
                        p.graphics.beginFill(this.nextColor());
                        p.graphics.drawRect(0, 0, 32,32);
                        p.graphics.endFill();
                        this.world.addChild(p);
                        this.platforms.push(p);
                        this.lastDrawnX += p.width;
                        this.lastDrawnY = p.y;
                    }
                }                
                case PlatformGenerationMode.SlopeAscent:
                {
                    const len = random(10,30);
                    const ascent = random(-10,-7);
                    let x = 0;
                    for (let n = 0; n < len; n++) {
                        const p = new egret.Shape();
                        p.x = this.lastDrawnX;
                        p.y = this.lastDrawnY + ascent + random(-5,5);
                        p.graphics.beginFill(this.nextColor());
                        p.graphics.drawRect(0, 0, 32,32);
                        p.graphics.endFill();
                        this.world.addChild(p);
                        this.platforms.push(p);
                        this.lastDrawnX += p.width;
                        this.lastDrawnY = p.y;
                    }
                }
                break;
                case PlatformGenerationMode.LevelsAscent:
                case PlatformGenerationMode.LevelsDescnet:
                case PlatformGenerationMode.Cliff:
                case PlatformGenerationMode.Pits:
                case PlatformGenerationMode.LargePit:
                break;
            }
        }
    }

    private updateCamera(): void {
//        const toMove = this.ball.x - this.cameraX;
//        this.cameraX += Math.min(10,toMove / 60);
        this.cameraX  = this.ball.x;
        this.world.x = this.width / 2 - this.cameraX;
        this.world.y = this.height / 2;
    }

    private tap(e: egret.TouchEvent) {
        this.tapped = true;
    }
}
