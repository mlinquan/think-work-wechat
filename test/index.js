var assert = require('assert');
var path = require('path');
var fs = require('fs');
var http = require('http');
var moment = require('moment');

var thinkjs = require('thinkjs');
var instance = new thinkjs();
instance.load();


var wechatapi = require('../index.js');

var wxapi = new wechatapi({
    token: 'Uy84PhsFd1aD2tg',
    appid: 'wxe6864235e9306ba5',
    appsecret: '6f5dcd352048ae65fe5926647efc455d',
    encodingAESKey: '826FLqYWmpuBgj9vbxw4f2zUwU8bPjGdhScxQHb9bRj'
});
// var getHttp = function(options){
//   var req = new http.IncomingMessage();
//   req.headers = { 
//     'host': 'www.thinkjs.org',
//     'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
//     'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_0) AppleWebKit',
//   };
//   req.method = 'GET';
//   req.httpVersion = '1.1';
//   req.url = '/index/index';
//   var res = new http.ServerResponse(req);
//   res.write = function(){
//     return true;
//   }

//   return think.http(req, res).then(function(http){
//     if(options){
//       for(var key in options){
//         http[key] = options[key];
//       }
//     }
//     return http;
//   })
// }

// var execMiddleware = function(options){
//   return getHttp(options).then(function(http){
//     var instance = new Class(http);
//     return instance.run();
//   })
// }


describe('think-wechatapi', function(){
  it('test init', function(done){
    var wxapi = new wechatapi();
    done();
  })
  it('test function', function(done){
    wxapi.aesEncrypt("aaa");
    wxapi.handleError({});
    done();
  })
  it('test get assess_token', function(done){
    wxapi.accessToken().then(function(token){
      done();
    });
  })
  it('test get user list', function(done){
    wxapi.user.get().then(function(user_list){
      done();
    });
  })
  it('test get all user', function(done){
    wxapi.user.get_all().then(function(user_list){
      done();
    });
  })
  it('test push all user', function(done){
    wxapi.message.push_all({
        "template_id": "YTd_S6NTQPfPnaGd0CevXfIVaBDPXYJjfowu9bhYyeM",
        "topcolor": "#000000",
        "data": {
            "now_time": {
                "value": moment().format("YYYY年M月D日 HH:mm:ss"),
                "color": "#000000"
            }
        }
    }).then(function(user_list){
        done();
    });
  })
})