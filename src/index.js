'use strict';

var rp = require('request-promise');
var moment = require('moment');
var crypto = require('crypto');
var mysql = require('mysql');
var fs = require('fs');

var errors = require('./lib/errors.js');
//var api_limit = require('./lib/api_limit.js');

var libs = require('./lib');

/*
src/common/config/workwechat.js
workwechat: {
    token: 'xxxxxxxxxxxxxxx',
    corpid: 'wxe1234567890abcde',
    appsecret: '1234567890abcdefghijklmnopqrstuv',
    encodingAESKey: '1234567890abcdefghijklmnopqrstuvxyz12345678',
    AESKey: '1PVNV80z24KmCm2U',
    iv: '1572033555800355',
    pathname: 'api'
}
*/

var workwechat = function(options) {
    this.options = think.parseConfig({pathname: 'workwechat'}, think.config('workwechat'), options);
    this.token = this.options.token;
    this.corpid = this.options.corpid;
    this.appsecret = this.options.appsecret;
    this.encodingAESKey = this.options.encodingAESKey;
    /*this.cache_config = think.parseConfig({
        type: "file",
        timeout: 7140,
        path: think.RUNTIME_PATH + "/cache", //缓存文件的根目录
        path_depth: 1
    }, think.config('cache'), {
        timeout: 7140,
        prefix: "workwechat_" + this.corpid + '_',
        file_ext: "_workwechat_" + this.corpid + ".json" //缓存文件的扩展名
    });*/
    this.cache_config = think.parseConfig({
        type: "file",
        timeout: 7140,
        path: think.RUNTIME_PATH + "/cache", //缓存文件的根目录
        path_depth: 1,
        timeout: 7140,
        file_ext: "_workwechat_" + this.corpid + ".json" //缓存文件的扩展名
    });
    this.access_token = {
        "access_token": null,
        "expires_on": 0
    };
    this.jsapi_ticket = {
        "ticket": null,
        "expires_on": 0
    };
    let cache = think.adapter("cache", this.cache_config.type);
    this.cache = new cache(this.cache_config);
    let session_option = think.config('cache');
    let session = think.adapter("session", session_option.type);
    let db_config = think.parseConfig({
        type: 'mongo'
    }, think.config("db"), {
        database: 'soa',
        prefix: ''
    });
    // let db_config = think.parseConfig({
    //     type: 'mongo'
    // }, think.config("db"), {
    //     database: 'soa',
    //     prefix: this.options.corpid + '_'
    // });
    this.session = new session(session_option);
    let think_model = think.model({
        tablePrefix: '',
        database: 'soa',
        init: function(){
            this.super("init", arguments);
        }
    });
    // let think_model = think.model({
    //     tablePrefix: this.options.corpid + '_',
    //     database: 'workwechat',
    //     init: function(){
    //         this.super("init", arguments);
    //     }
    // });
    this.model = {
        // api_usage: new think_model("api_usage", db_config),
        // api_log: new think_model("api_log", db_config),
        department: new think_model("department", db_config),
        user: new think_model("user", db_config)
    };
    
    //this.api_limit = api_limit;
    for(let name in libs) {
        this[name]();
    }
    /* 初始化同步数据 */
    let init = !!process.env.INIT;
    let db_init = !!process.env.db_init;
    let _self = this;
    if(db_init) {
        //创建mysql数据库
        if(db_config.type == 'mysql') {
            let mysql_config = this.jsonpf(db_config);
            delete mysql_config.database;
            var connection = mysql.createConnection(mysql_config);
            connection.connect();
            var sql = fs.readFileSync(__dirname + '/workwechat.sql', 'utf-8');
            let database = db_config.database;
            sql = sql.replace(/\{DATABASE\}/g, database);
            sql = sql.replace(/\{PREFIX\}/g, db_config.prefix);
            sql = sql.replace(/--(.*)/g, '');
            sql = sql.replace(/^\s+|\;$/g, '');
            sql = sql.replace(/\s+/g, ' ');
            sql = sql.replace(/\s*\;\s*/g, ';');
            let sql_arr = sql.split(';');
            sql_arr.forEach(function(sql_query, i) {
                if(sql_query) {
                    connection.query(sql_query, function() {
                        if(i == sql_arr.length) {
                            connection.close();
                        }
                    });
                }
            });
        }
    }
    if(init) {
        //同步部门列表
        _self.department.list()
        .then(function(part_list) {
            part_list.department.forEach(function(part) {
              _self.model.department.field("id").where({id: part.id}).select()
              .then(function(exist) {
                if(!think.isEmpty(exist)) {
                  return;
                }
                _self.model.department.add(part)
                .then(function(part) {
                    console.log(part);
                }, function(error) {
                    console.log(error);
                });
              });
            });
        });
        //同步用户列表
        _self.user.all_list()
        .then(async function(user_list) {
            for(let i=0;i<=user_list.userlist.length;i++) {
                let one_user = user_list.userlist[i];
                let exist = await _self.model.user.field("id").where({userid: one_user.userid}).select();
                if(!think.isEmpty(exist)) {
                    await _self.model.user.where({id: exist[0].id}).update(one_user);
                    continue;
                }
                one_user.department = (one_user.department && '_' + one_user.department.join('_') + '_') || '';
                one_user.order = (one_user.order && '_' + one_user.order.join('_') + '_') || '';
                one_user.extattr = JSON.stringify(one_user.extattr);
                let added = await _self.model.user.add(one_user);
                console.log(added);
            }
        });
    }
};

workwechat.prototype = {
    jsonpf: function(json) {
        return JSON.parse(JSON.stringify(json));
    },

    timestamp: function(delay) {
        delay = Number(delay) || 0;
        return new Date().getTime() + delay*1000;
    },

    aesEncrypt: function(data, secretKey, iv, mode) {
        secretKey = secretKey || this.options.AESKey;
        mode = mode || 'aes-128-cbc';
        iv = iv || this.options.iv;
        var encipher = crypto.createCipheriv(mode, secretKey, iv),
        encoded  = encipher.update(data, 'utf8', 'hex');
        encoded += encipher.final('hex');
        return encoded;
    },

    handleError: function(errcode, onlymsg){
        let errorConfig = think.parseConfig({
            "key":"errcode",
            "msg":"errmsg"
        }, think.config('error'));
        var result = {
        };
        result[errorConfig.key] = (errors[errcode] && errcode) || 0;
        result[errorConfig.msg] = errors[errcode] || "";
        if(onlymsg) {
            return result[errorConfig.msg];
        }
        return result;
    },

    /**
     * get request
     * @return {Promise} []
     */
    get: async function(path, content, method = 'GET', refresh = false){
        let _self = this;
        path = path.replace('CORPID', _self.corpid).replace('APPSECRET', _self.appsecret);
        content = content || '';
        let options = {
            url: 'https://qyapi.weixin.qq.com' + path,
            method: method,
            agent:false,
            rejectUnauthorized : false,
            body: content,
            json: true
        };
        var opt = options;
        var api_name = path.replace('/cgi-bin/', '').replace(/\?.*/, '').split('/').join('_');
        if(api_name == 'user_info_batchget') {
            api_name = 'user_info';
        }
        if(/ACCESS_TOKEN/.test(opt.url)) {
            let token = await _self.accessToken(refresh);
            if(token.access_token) {
                opt.url = opt.url.replace('ACCESS_TOKEN', token.access_token);
            } else {
                return token;
            }
        }
        var data = await rp(opt);
        let today = moment().format('YYYY-MM-DD');
        /*if(api_limit[api_name]) {
            let now_time = moment().format('YYYY-MM-DD HH:mm:ss.SSS');
            _self.model.api_log.add({"used_time": now_time, "api_name": api_name})
            .then(function(api_log_id) {

            }, function(error) {

            });
        }
        if(api_name == "message_template_send") {
            var message_info = _self.jsonpf(content);
            message_info.data = JSON.stringify(content.data);
            message_info.MsgID = data.msgid;
            if(data && data.errcode == 43004 && message_info) {
                message_info.Status = _self.handleError(data.errcode, true);
            }
            _self.model.push_log.add(message_info)
            .then(function(push_log_id) {

            }, function(error) {

            });
        }*/

        if(data && data.errcode == 40001) {
            return _self.get(path, content, method, true);
        }

        if(data && data.errcode) {
            return _self.handleError(data.errcode);
        }

        /*if(api_limit[api_name]) {
            _self.model.api_usage.where({"used_date": today, "api_name": api_name}).increment("today_used")
            .then(function(api_used) {
                if(api_used == 0) {
                    _self.model.api_usage.add({"used_date": today, "api_name": api_name, "today_used": 1})
                    .then(function(api_used_id) {

                    }, function(error) {

                    });
                }
            }, function(error) {

            });
        }*/
        return data;
    },
    /**
     * post request
     * @return {Promise} []
     */
    post: async function(path, content) {
        return this.get(path, content, 'POST');
    },
    /**
     * get access_token
     * @return {String} []
     */
    accessToken: async function(refresh){
        let token = 
        (!refresh && ((this.access_token.expires_on > this.timestamp()) && this.access_token))
        || (!refresh && await this.cache.get('access_token'))
        || await this.get('/cgi-bin/gettoken?corpid=CORPID&corpsecret=APPSECRET')
        ;
        if(token.access_token) {
            if(token.expires_in) {
                token.expires_in = 0;
                token.expires_on = this.timestamp(7140);
                this.cache.set('access_token', token);
            }
            this.access_token = token;
        }
        return token;
    }
};

for(let name in libs) {
    workwechat.prototype[name] = libs[name];
}

module.exports = workwechat;