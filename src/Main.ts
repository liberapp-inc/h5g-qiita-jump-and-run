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


    protected createGameScene(): void {
        this.world = new egret.DisplayObjectContainer();
        this.addChild(this.world);

        this.lastDrawnX  = - this.width / 2;  
        this.cameraX = 0; 
        this.updateCamera();
    }

    private enterFrame(t:number):boolean {
        this.cameraX += 1;
        this.generateNewBlocks();        
        this.updateCamera();
        this.eraseBlocksOutOfCamera();
        return true;
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
        this.world.x = this.width / 2 - this.cameraX;
        this.world.y = this.height / 2;
    }
}
