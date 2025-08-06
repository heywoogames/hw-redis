'use strict';

const Redis = require( 'ioredis' );

const { HwPluginBase } = require('@heywoogames/hw-base')

class Rediscli extends HwPluginBase
{
  /** 包含的 redis  实例 
   * @type {Record<string, import('ioredis').Redis>} 
   * 
  */
  #_ins = {};

  /** 实例映射 key 是 ip和端口的组合
     * @type {Object.<string, import('ioredis').Redis>} 
     * 
    */
  #insMap = {};

  /** 包含的 订阅类型 redis  实例 
   * @type {Object.<string, import('ioredis').Redis>} 
   * 
  */
  #subIns = {};

  /** 订阅实例映射 key 是 ip和端口的组合
     * @type {Object.<string, import('ioredis').Redis>} 
     * 
    */
  #subInsMap = {};

  constructor ( app, name, info ) {
    super( app, name, info );
  }

  /**
   * 
   * @param {string} ip 
   * @param {number} port 
   * @param {number} db 
   * @returns 
   */
  #getMapKey(ip, port, db) {
    return `${ip}:${port}:${db??0}`;
  }

  get _() {
    return this.#_ins;
  }

  /**
   * 
   * @param {string} name 
   * @param {import('.').HwRedisCfg} cfg 
   * @param {boolean} isSub 
   * @returns {Redis | null}
   */
  #makeIns( name, cfg, isSub ) {
    const key = this.#getMapKey( cfg.host, cfg.port, cfg.db );
    if( isSub === false ) {
      const insT = this.#insMap[key];
      if( insT !== undefined ) {
        this.app.logger.info(`reuse normal redis: ${cfg.host}:${cfg.port}:${cfg.db}`);
        return insT;
      }

      if( this.#_ins[name] ) {
        const err = `redis normal [ ${name} ] instance has exist!`;
        this.app.logger.warn( err );
        throw new Error( err );
      }
    } else {
      const insT = this.#subInsMap[key];
      if( insT !== undefined ) {
        this.app.logger.info(`reuse sub redis: ${cfg.host}:${cfg.port}:${cfg.db}`);
        return insT;
      }

      if( this.#subIns[name] ) {
        const err = `redis sub [ ${name} ] instance has exist!`;
        this.app.logger.warn( err );
        throw new Error( err );
      }
    }

    const ins = new Redis( cfg );
    ins.on( "ready",  ( err )=>{
      if( !err ) {
        this.app.logger.info( `redis ${name} is Reday!` )
      }
    } );

    ins.on( "error", ( err )=>{
      this.app.logger.warn( `redis ${name} error!`, err.toString() );
    } );

    ins.on( "reconnecting",  ( err )=>{
      this.app.logger.warn( `redis ${name} is reconnecting!` )
    } );

    // 添加到映射表里面方便重用
    if( isSub === false ) {
      this.#insMap[ key ] = ins;      
    } else {
      this.#subInsMap[key] = ins;
    }

    return ins;
  }

  /** 根据名字获取redis实例
   * 
   * @param {string?} name 实例名字,不跟使用缺省的 
   * @returns {import('ioredis').Redis}
   */
  getInsByName( name ) {
    if( name === undefined || name === null ) {
      name = this._cfg.default;
    }

    return this.#_ins[name]?? null;
  }

  /** 
   * 根据IP和端口号获取实例
   * @param {string} ip 
   * @param {number} port 
   * @param {number?} db - DB 索引 
   * @returns {import('ioredis').Redis}
   */
  getInsByAddr( ip, port, db ) {
    const key = this.#getMapKey( ip, port, db );
    return this.#insMap[ key ] ?? null;
  }

  /** 获取实例
   * 
   * @param {string} name 实例名字 
   * @param {} cfg 实例配置
   * @param {boolean} isSub - 是否订阅类型
   *    - false， 不是， 如果实例不存在，会创建新的，如果存在，重用
   *    - true,  是， 对于订阅类型的，就创建一个新的
   */
  async getIns( name, cfg, isSub = false ) {
    const ins = this.#makeIns( name, cfg, isSub );
    if( isSub === false ) {
      this.#_ins[ name ] = ins;
      if (this._cfg?.default === undefined) {
        this._cfg.default = name;
      }
    } else {
      this.#subIns[name] = ins;
    }

    return ins;
  }

  /**
   * @ignore
   */
  async init ( ) {
    /** @type {import('./index').HwRedisCfg & {default?: string}} */
    this._cfg = await this.getConfig();
    if( !this._cfg ) {
      throw new Error( 'xxx not find redis.json' );
    }

    const insNames = Object.keys(this._cfg.instance);
    if( (this._cfg?.default === undefined) || (insNames.indexOf(this._cfg.default) === -1) ) {
      if( insNames.length > 0 ) {
        this._cfg.default = insNames[0];
      } else {
        delete this._cfg.default;
      }
    }

    for(let insName in this._cfg.instance) {
      insNames.push( insName);
      const cfg = this._cfg.instance[insName];
      await this.getIns( insName, cfg, false );
    }
  }


  async start () {

  }

  async stop() {
    for( let insName in this.#insMap) {
      const ins = this.#insMap[insName];
      await ins.quit();
    }

    for( let insName in this.#subInsMap ) {
      const ins = this.#subInsMap[insName];
      await ins.quit();
    }
  }
}




module.exports = Rediscli;


