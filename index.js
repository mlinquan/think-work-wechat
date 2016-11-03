'use strict';var _regenerator = require('babel-runtime/regenerator');var _regenerator2 = _interopRequireDefault(_regenerator);var _stringify = require('babel-runtime/core-js/json/stringify');var _stringify2 = _interopRequireDefault(_stringify);var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

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

var workwechat = function workwechat(options) {var _this = this;
    this.options = think.parseConfig({ pathname: 'workwechat' }, think.config('workwechat'), options);
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
        "expires_on": 0 };

    this.jsapi_ticket = {
        "ticket": null,
        "expires_on": 0 };

    var cache = think.adapter("cache", this.cache_config.type);
    this.cache = new cache(this.cache_config);
    var session_option = think.config('cache');
    var session = think.adapter("session", session_option.type);
    var db_config = think.parseConfig({
        type: 'mongo' },
    think.config("db"), {
        database: 'soa',
        prefix: '' });

    // let db_config = think.parseConfig({
    //     type: 'mongo'
    // }, think.config("db"), {
    //     database: 'soa',
    //     prefix: this.options.corpid + '_'
    // });
    this.session = new session(session_option);
    var think_model = think.model({
        tablePrefix: '',
        database: 'soa',
        init: function init() {
            this.super("init", arguments);
        } });

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
        user: new think_model("user", db_config) };


    //this.api_limit = api_limit;
    for (var name in libs) {
        this[name]();
    }
    /* 初始化同步数据 */
    var init = !!process.env.INIT;
    var db_init = !!process.env.db_init;
    var _self = this;
    if (db_init) {
        //创建mysql数据库
        if (db_config.type == 'mysql') {var


            connection;var

            sql;(function () {var mysql_config = _this.jsonpf(db_config);delete mysql_config.database;connection = mysql.createConnection(mysql_config);connection.connect();sql = fs.readFileSync(__dirname + '/workwechat.sql', 'utf-8');
                var database = db_config.database;
                sql = sql.replace(/\{DATABASE\}/g, database);
                sql = sql.replace(/\{PREFIX\}/g, db_config.prefix);
                sql = sql.replace(/--(.*)/g, '');
                sql = sql.replace(/^\s+|\;$/g, '');
                sql = sql.replace(/\s+/g, ' ');
                sql = sql.replace(/\s*\;\s*/g, ';');
                var sql_arr = sql.split(';');
                sql_arr.forEach(function (sql_query, i) {
                    if (sql_query) {
                        connection.query(sql_query, function () {
                            if (i == sql_arr.length) {
                                connection.close();
                            }
                        });
                    }
                });})();
        }
    }
    if (init) {
        //同步部门列表
        _self.department.list().
        then(function (part_list) {
            part_list.department.forEach(function (part) {
                _self.model.department.field("id").where({ id: part.id }).select().
                then(function (exist) {
                    if (!think.isEmpty(exist)) {
                        return;
                    }
                    _self.model.department.add(part).
                    then(function (part) {
                        console.log(part);
                    }, function (error) {
                        console.log(error);
                    });
                });
            });
        });
        //同步用户列表
        _self.user.all_list().
        then(function () {var _ref = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee(user_list) {var i, one_user, exist, added;return _regenerator2.default.wrap(function _callee$(_context) {while (1) {switch (_context.prev = _context.next) {case 0:
                                i = 0;case 1:if (!(i <= user_list.userlist.length)) {_context.next = 20;break;}
                                one_user = user_list.userlist[i];_context.next = 5;return (
                                    _self.model.user.field("id").where({ userid: one_user.userid }).select());case 5:exist = _context.sent;if (
                                think.isEmpty(exist)) {_context.next = 10;break;}_context.next = 9;return (
                                    _self.model.user.where({ id: exist[0].id }).update(one_user));case 9:return _context.abrupt('continue', 17);case 10:


                                one_user.department = one_user.department && '_' + one_user.department.join('_') + '_' || '';
                                one_user.order = one_user.order && '_' + one_user.order.join('_') + '_' || '';
                                one_user.extattr = (0, _stringify2.default)(one_user.extattr);_context.next = 15;return (
                                    _self.model.user.add(one_user));case 15:added = _context.sent;
                                console.log(added);case 17:i++;_context.next = 1;break;case 20:case 'end':return _context.stop();}}}, _callee, this);}));return function (_x) {return _ref.apply(this, arguments);};}());


    }
};

workwechat.prototype = {
    jsonpf: function jsonpf(json) {
        return JSON.parse((0, _stringify2.default)(json));
    },

    timestamp: function timestamp(delay) {
        delay = Number(delay) || 0;
        return new Date().getTime() + delay * 1000;
    },

    aesEncrypt: function aesEncrypt(data, secretKey, iv, mode) {
        secretKey = secretKey || this.options.AESKey;
        mode = mode || 'aes-128-cbc';
        iv = iv || this.options.iv;
        var encipher = crypto.createCipheriv(mode, secretKey, iv),
        encoded = encipher.update(data, 'utf8', 'hex');
        encoded += encipher.final('hex');
        return encoded;
    },

    handleError: function handleError(errcode, onlymsg) {
        var errorConfig = think.parseConfig({
            "key": "errcode",
            "msg": "errmsg" },
        think.config('error'));
        var result = {};

        result[errorConfig.key] = errors[errcode] && errcode || 0;
        result[errorConfig.msg] = errors[errcode] || "";
        if (onlymsg) {
            return result[errorConfig.msg];
        }
        return result;
    },

    /**
        * get request
        * @return {Promise} []
        */
    get: function () {var _ref2 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee2(path, content) {var method = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'GET';var refresh = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;var _self, options, opt, api_name, token, data, today;return _regenerator2.default.wrap(function _callee2$(_context2) {while (1) {switch (_context2.prev = _context2.next) {case 0:
                            _self = this;
                            path = path.replace('CORPID', _self.corpid).replace('APPSECRET', _self.appsecret);
                            content = content || '';
                            options = {
                                url: 'https://qyapi.weixin.qq.com' + path,
                                method: method,
                                agent: false,
                                rejectUnauthorized: false,
                                body: content,
                                json: true };

                            opt = options;
                            api_name = path.replace('/cgi-bin/', '').replace(/\?.*/, '').split('/').join('_');
                            if (api_name == 'user_info_batchget') {
                                api_name = 'user_info';
                            }if (!
                            /ACCESS_TOKEN/.test(opt.url)) {_context2.next = 16;break;}_context2.next = 10;return (
                                _self.accessToken(refresh));case 10:token = _context2.sent;if (!
                            token.access_token) {_context2.next = 15;break;}
                            opt.url = opt.url.replace('ACCESS_TOKEN', token.access_token);_context2.next = 16;break;case 15:return _context2.abrupt('return',

                            token);case 16:_context2.next = 18;return (


                                rp(opt));case 18:data = _context2.sent;
                            today = moment().format('YYYY-MM-DD');
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
                                                                   }*/if (!(





                            data && data.errcode == 40001)) {_context2.next = 22;break;}return _context2.abrupt('return',
                            _self.get(path, content, method, true));case 22:if (!(


                            data && data.errcode)) {_context2.next = 24;break;}return _context2.abrupt('return',
                            _self.handleError(data.errcode));case 24:return _context2.abrupt('return',

















                            data);case 25:case 'end':return _context2.stop();}}}, _callee2, this);}));function get(_x2, _x3, _x4, _x5) {return _ref2.apply(this, arguments);}return get;}(),

    /**
                                                                                                                                                                                              * post request
                                                                                                                                                                                              * @return {Promise} []
                                                                                                                                                                                              */
    post: function () {var _ref3 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee3(path, content) {return _regenerator2.default.wrap(function _callee3$(_context3) {while (1) {switch (_context3.prev = _context3.next) {case 0:return _context3.abrupt('return',
                            this.get(path, content, 'POST'));case 1:case 'end':return _context3.stop();}}}, _callee3, this);}));function post(_x8, _x9) {return _ref3.apply(this, arguments);}return post;}(),

    /**
                                                                                                                                                                                                                * get access_token
                                                                                                                                                                                                                * @return {String} []
                                                                                                                                                                                                                */
    accessToken: function () {var _ref4 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee4(refresh) {var token;return _regenerator2.default.wrap(function _callee4$(_context4) {while (1) {switch (_context4.prev = _context4.next) {case 0:_context4.t1 =

                            !refresh && this.access_token.expires_on > this.timestamp() && this.access_token;if (_context4.t1) {_context4.next = 8;break;}_context4.t2 =
                            !refresh;if (!_context4.t2) {_context4.next = 7;break;}_context4.next = 6;return this.cache.get('access_token');case 6:_context4.t2 = _context4.sent;case 7:_context4.t1 = _context4.t2;case 8:_context4.t0 = _context4.t1;if (_context4.t0) {_context4.next = 13;break;}_context4.next = 12;return (
                                this.get('/cgi-bin/gettoken?corpid=CORPID&corpsecret=APPSECRET'));case 12:_context4.t0 = _context4.sent;case 13:token = _context4.t0;

                            if (token.access_token) {
                                if (token.expires_in) {
                                    token.expires_in = 0;
                                    token.expires_on = this.timestamp(7140);
                                    this.cache.set('access_token', token);
                                }
                                this.access_token = token;
                            }return _context4.abrupt('return',
                            token);case 16:case 'end':return _context4.stop();}}}, _callee4, this);}));function accessToken(_x10) {return _ref4.apply(this, arguments);}return accessToken;}() };



for (var name in libs) {
    workwechat.prototype[name] = libs[name];
}

module.exports = workwechat;