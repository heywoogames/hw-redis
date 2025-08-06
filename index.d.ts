
import { HwPluginBase } from "@heywoogames/hw-base";
import { Redis, RedisOptions } from 'ioredis'


export type HwRedisCfg = RedisOptions & {
    host: string,
    port : number,
    username?: string,
    password?: string,
    db?: number
};


export class HwRediscli extends HwPluginBase {

    /** 根据名字获取redis实例
     * 
     * @param name 实例名字,不跟使用缺省的
     */
    getInsByName( name?: string ): Redis | null;


    /** 
     * 根据IP和端口号获取实例
     * @param ip 
     * @param port 
     * @param db - 缺省为0
     */
    getInsByAddr( ip: string, port: number, db?: number ): Redis | null;


    /** 获取实例
     * 
     * @param name 实例名字 
     * @param cfg 实例配置
     * @param isSub - 是否订阅类型
     *    - false， 不是， 如果实例不存在，会创建新的，如果存在，重用
     *    - true,  是， 对于订阅类型的，就创建一个新的
     */
    getIns( name: string, cfg: HwRedisCfg, isSub = false ): Promise< Redis >;
}

