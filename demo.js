const Screenshot = require('./screenshots');
const crypto = require('crypto');
const urlParser = require('url');

let url = process.argv[2];//'https://stackoverflow.com/questions/22528967/es6-class-variable-alternatives';
let filepath = './tmp';//__dirname+'/../../mnt/sbs/images';

let urlData = urlParser.parse(url);
let hash = crypto.createHash('md5').update(url).digest('hex');
let fileDomain = urlData.hostname.replace(/[^a-z0-9]/gi, '_').toLowerCase();
let filename = fileDomain+'_'+hash;


let wait = 2000;
if(/(youtube\.|dailymotion\.com|liveleak\.com|twitch\.tv|viewster\.com|metacafe\.com|vimeo\.com|veoh\.com|viddler\.com)/.exec(url)){
    wait=6000;
}

if(/\.(pdf|ppt|doc|docs|excel|dot|wbk|docm|dotx|dotm|docb|xls|xlt|xlm|pot|pps|pptx|pptm|potx|potm|ppam|ppsx|ppsm)($|\W)/.exec(url)){
    url='https://docs.google.com/gview?url='+url.trim()+'&embedded=true&toolbar=hide';
    wait=5000;
}

let screenshot = new Screenshot()
    .setWait(wait)
    .setFilePath(filepath)
    .setFileName(filename)
    .setSizes({'desktop':[1280, 1024], 'tablet':[664, 920], 'mobile':[320, 533]})
    .setResizes({'desktop':[180, 120]}, true)
    .shot(url, (err, images)=>{
        if(err) console.log(err);
        console.log(images);
    });
