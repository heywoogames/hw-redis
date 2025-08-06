const base = require('@heywoogames/hw-base');

class Main extends base.HwAppBase
{
    constructor(){
        super();

        /** @type { import('..').HwRediscli } */
        this._rd = null;
        this.timer = null;

        this.on('cfg_change', (alias, content, dataId) => {
            console.log( `--- alias: ${alias} dataId: ${dataId}, cfgChange: ` );
        })
    }

    async onBeforeInit() {
        this.env.PROJ_PATH = this.env.PROJ_PATH + '/example';
        this.env.CFG_PATH = this.env.PROJ_PATH + '/config';

        this.cmdlineParser.option('-p, --path [path...]', 'monitor path')
        console.log( '--- onBeforeInit' );
    }

    async onAfterInit() {
    }

    async onBeforeStart(){
        this.logger.info( this.env.PROJ_PATH);
        console.log( '-- onBeforeStart' );
    }

    async onAfterStart(){
        console.log( '-- onAfterStart' );

        this._rd = this.getPlugin('redis');
        const pMaster = this._rd.getInsByName('master');
        const pSlvae = this._rd.getInsByName('slave');
        const pDef = this._rd.getInsByName();
        console.log( ' is Same: ', pMaster === pDef );
        const subIns = await this._rd.getIns( "sub", {
            host : "127.0.0.1",
            port : 6379,
            password : "111111",
        }, true );

        subIns.psubscribe(['msg.*'], function (err, count) {});
        subIns.on('pmessage', (pattern, channel, message) =>{
            console.log('--- onpmessage', pattern, channel, message);
        });

        this.testStep = 0;

        this.timer = setInterval( async ()=>{
            switch( this.testStep ) {
                case 0:
                    await pMaster.set('test123', Date.now())
                break;
                case 1:
                    subIns.psubscribe(['msg1.*'], function (err, count) {
                        if(err) {
                            console.error( err.toString());
                        }
                    });
                break;
                default:
                    {
                        const ret = await pSlvae.get('test123');
                        console.log('--- get', ret, Date.now());
                    }
                break;
            }

            this.testStep++;

            if( this.testStep >= 10 ) {
                clearInterval( this.timer );
                this.timer = null;
                this.stop();
            }
        }, 1000);
    }

    async onBeforeStop(){
        console.log( '--- onBeforeStop' );
        if( this._timer !== null ) {
            clearInterval( this._timer );
        }
    }

    async onAfterStop(){
        console.log( '--- onAfterStop' );
        process.exit(0)
    }


}

(async()=>{
    const main = new Main();
    await main.init();
    await main.start();
})();

