const PLATFORM_BLOCK_WIDTH = 32;

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
        this.ball.y = 0;
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
            this.ballVy += 0.1;
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

    private generateNewBlocks() {
        const generationBorder = this.cameraX + this.width;
        while(this.lastDrawnX  < generationBorder) {
            const p = new egret.Shape();
            p.x = this.lastDrawnX;
            p.y = 0;
            this.lastDrawnX += PLATFORM_BLOCK_WIDTH;
            
            const c = this.colors[this.generationIndex];
            p.graphics.beginFill(c);
            p.graphics.drawRect(0, 0, PLATFORM_BLOCK_WIDTH,PLATFORM_BLOCK_WIDTH);
            p.graphics.endFill();
            this.world.addChild(p);
            this.platforms.push(p);
            this.generationIndex = (this.generationIndex + 1) % 2;
        }
    }

    private updateCamera(): void {
        const toMove = this.ball.x - this.cameraX;
        this.cameraX += Math.min(10,toMove / 60);
        this.world.x = this.width / 2 - this.cameraX;
        this.world.y = this.height / 2;
    }

    private tap(e: egret.TouchEvent) {
        this.tapped = true;
    }
}
