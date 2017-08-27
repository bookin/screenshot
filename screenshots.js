const chrome = require('chrome-remote-interface');
const fs = require('fs');
const sharp = require('sharp');

class Screenshot {

    constructor() {
        this.defaultSize = {'default':[1280, 1024]};
        this.defaultPath = './tmp';
        this.images = {};
        this.try = 0;
    }

    setWait(time){
        this.wait = time;
        return this;
    }

    setResizes(sizes, isSaveOriginal){
        this._resizes = sizes;
        this.saveOriginal = (typeof isSaveOriginal === 'boolean' ? isSaveOriginal : false);
        return this;
    }

    get resizes(){
        return this._resizes;
    }

    setSizes(sizes){
        this._sizes = sizes;
        return this;
    }

    get sizes(){
        return this._sizes;
    }

    setFileName(name){
        this._filename = name;
        return this;
    }

    get filename(){
        return this._filename;
    }

    setFilePath(path){
        this._filepath = path.replace(/\/+$/,'');
        return this;
    }

    get filepath(){
        return this._filepath;
    }

    async makeScreenshots(client, url, callback) {
        const wait = this.wait || 0;
        const sizes = this.sizes || [this.defaultSize];
        const path = this.filepath || this.defaultPath;
        const resizes = this.resizes;

        const {Emulation, Page, Runtime} = client;

        try {
            await Page.enable();
            await Page.navigate({url: url});
            await Page.loadEventFired();

            let promise = new Promise((resolve, reject) => {
                setTimeout(async ()=>{
                    const deviceMetrics = {
                        deviceScaleFactor: 0,
                        mobile: false,
                        fitWindow: false,
                    };

                    for(let key in sizes){
                        if (!sizes.hasOwnProperty(key)) continue;

                        let width = sizes[key][0];
                        let height = sizes[key][1];

                        deviceMetrics.width = width;
                        deviceMetrics.height = height;
                        await Emulation.setDeviceMetricsOverride(deviceMetrics);
                        await Emulation.setVisibleSize({width: width, height: height});

                        const {data} = await Page.captureScreenshot({format:'jpeg',quality:75});
                        let buffer = new Buffer(data, 'base64');

                        let fileName = `${this.filename}-${key.toLowerCase()}.jpg`;
                        let filePath = `${path}/${fileName}`;

                        this.images[key]={'name':fileName, 'path':filePath};

                        if(resizes[key] !== undefined){
                            sharp(buffer).resize(resizes[key][0], resizes[key][1]).toFile(filePath, (err) => {
                                if(err) { reject(err); }
                            });

                            if(this.saveOriginal){
                                fileName = `${this.filename}-original-${key.toLowerCase()}.jpg`;
                                filePath = `${path}/${fileName}.jpg`;
                                this.images[key]['original'] = {'name':fileName, 'path':filePath};
                            }
                        }

                        if(resizes[key] === undefined || this.saveOriginal){
                            fs.writeFile(filePath, buffer, 'base64', (err) => {
                                if (err) { reject(err); }
                            });
                            /*fs.writeFileSync(filePath, buffer, {'encode':'base64'});*/
                        }
                    }

                    resolve();

                }, wait);
            });

            promise.then(
                result => {
                    client.close();
                    if(typeof callback === 'function'){
                        callback(null, this.images);
                    }
                },
                error => {
                    client.close();
                    if(typeof callback === 'function'){
                        callback(error);
                    }
                }
            );


        } catch (err) {
            if(typeof callback === 'function'){
                callback(err);
            }
        } finally {}
    }

    shot(url, callback){
        chrome(async (client) => {
            this.makeScreenshots(client, url, callback)
        }).on('error', (err,any)=>{
            this.chromeErrorHandler(err, (err)=>{
                if(err){
                    if(typeof callback === 'function'){
                        callback(err);
                    }
                }else{
                    this.shot(url, callback);
                }
            });
        });
    }

    chromeErrorHandler(err, callback){
        const exec = require('child_process').exec;
        const execute = function(command, excallback){
            exec(command, (error, stdout, stderr)=>{ excallback(stdout);});
        }

        if(this.try++ < 2){
            execute("ps ax | grep remote-debug", function(data) {
                if(data.match(/remote-debug/g).length < 3) {
                    execute("which google-chromed", function(path) {
                        if(!path){
                            callback('We can`t find google-chrome');
                            return;
                        }
                        path = path.split("\n");
                        Screenshot.chromeRelaunch(path[0], ()=>{
                            callback();
                        });
                    });
                }
            });
        }else{
            callback(err);
        }
    }

    /* defulat path - /opt/google/chrome/chrome */
    static chromeRelaunch(chromePath, callback){
        const spawn = require('child_process').spawn;
        let command = spawn(chromePath, [
            '--remote-debugging-port=9222',
            '--disable-translate',
            '--disable-extensions',
            '--disable-background-networking',
            '--safebrowsing-disable-auto-update',
            '--disable-sync',
            '--metrics-recording-only',
            '--disable-default-apps',
            '--no-first-run',
            '--disable-setuid-sandbox',
            '--window-size=1280x1012',
            '--disable-gpu',
            '--hide-scrollbars',
            '--headless',
            'about:blank',
        ], {
            stdio: 'ignore', // piping all stdio to /dev/null
            detached: true
        }).unref();
        setTimeout(()=>{
            callback()
        }, 2000);
    }
}

module.exports = Screenshot;