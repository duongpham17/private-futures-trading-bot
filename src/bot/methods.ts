import {kucoin, Klines} from '../@api/kucoin';
import {generateid, timeExpire} from '../@utils/functions';
import {calculateRsi, calculateVelocity, calculateStrength, calculateTrend} from './formula';
import Trades, {ITrades} from '../models/trades';
import Orders from '../models/orders';

export const exchanage_api = async ({trade}: {trade: ITrades}) => {
    const KucoinLive = kucoin({symbol: trade.market_id});
    const price = await KucoinLive.getPrice();
    return {
        KucoinLive,
        price: price ? price : null
    }
};

export const strategy_methods = async ({trade, price, KucoinLive}: {trade: ITrades, price: number, KucoinLive: any})  => {
    let [isLong, isShort] = [false, false];
    const {open_short, open_long, strategy} = trade;

    // Standard Counter
    if(strategy === "counter"){
        const long = price <= open_short;
        isLong = long;
        const short = price >= open_long;
        isShort = short;
    };
    if(strategy === "counter long only"){
        const long = price <= open_short;
        isLong = long;
    };
    if(strategy === "counter short only"){
        const short = price >= open_long;
        isShort = short;
    };

    // Standard Trend
    if (strategy === "trend"){
        const long = price >= open_long;
        isLong = long;
        const short = price <= open_short;
        isShort = short;
    };
    if (strategy === "trend long only"){
        const long = price >= open_long;
        isLong = long;
    };
    if (strategy === "trend short only"){
        const short = price <= open_short;
        isShort = short;
    };

    // Rsi Counter
    if(strategy === "rsi counter"){
        const klines = await KucoinLive.getKlines(trade.range_period);
        if(klines) {
            const rsi = calculateRsi(klines);
            const value = Number(rsi.slice(-1)[0].rsi);
            const long = value <= trade.range_over_sold_rsi;
            isLong = long;
            const short = value >= trade.range_over_bought_rsi;
            isShort = short;
        }
    };
    if(strategy === "rsi counter long only"){
        const klines = await KucoinLive.getKlines(trade.range_period);
        if(klines) {
            const rsi = calculateRsi(klines);
            const value = Number(rsi.slice(-1)[0].rsi);
            const long = value <= trade.range_over_sold_rsi;
            isLong = long;
        }
    };
    if(strategy === "rsi counter short only"){
        const klines = await KucoinLive.getKlines(trade.range_period);
        if(klines) {
            const rsi = calculateRsi(klines);
            const value = Number(rsi.slice(-1)[0].rsi);
            const short = value >= trade.range_over_bought_rsi;
            isShort = short;
        }
    };

    // Rsi Trend
    if(strategy === "rsi trend"){
        const klines = await KucoinLive.getKlines(trade.range_period);
        if(klines) {
            const rsi = calculateRsi(klines);
            const value = Number(rsi.slice(-1)[0].rsi);
            const long = value >= trade.range_over_bought_rsi;
            isLong = long;
            const short = value <= trade.range_over_sold_rsi;
            isShort = short;
        }
    };
    if(strategy === "rsi trend long only"){
        const klines = await KucoinLive.getKlines(trade.range_period);
        if(klines) {
            const rsi = calculateRsi(klines);
            const value = Number(rsi.slice(-1)[0].rsi);
            const long = value >= trade.range_over_bought_rsi;
            isLong = long;
        }
    };
    if(strategy === "rsi trend short only"){
        const klines = await KucoinLive.getKlines(trade.range_period);
        if(klines) {
            const rsi = calculateRsi(klines);
            const value = Number(rsi.slice(-1)[0].rsi);
            const short = value <= trade.range_over_sold_rsi;
            isShort = short;
        }
    };

    // Strength
    if(strategy === "strength counter"){
        const klines = await KucoinLive.getKlines(trade.range_period);
        if(klines) {
            const strength = calculateStrength(klines);
            const latest = strength.slice(-1)[0];
            const short = latest >= trade.range_target_high;
            isShort = short
            const long = latest <= trade.range_target_low;
            isLong = long
        }
    };
    if(strategy === "strength trend"){
        const klines = await KucoinLive.getKlines(trade.range_period);
        if(klines) {
            const strength = calculateStrength(klines);
            const latest = strength.slice(-1)[0];
            const long = latest >= trade.range_target_high;
            isLong = long
            const short = latest <= trade.range_target_low;
            isShort = short
        }
    };

    // Velocity
    if(strategy === "velocity counter"){
        const klines = await KucoinLive.getKlines(trade.range_period);
        if(klines){
            const {velocity, direction} = calculateVelocity(klines);
            if(direction === "up"){
                const short = velocity >= trade.range_target_high;
                isShort = short;
            } else {
                const long = velocity >= trade.range_target_low;
                isLong = long;
            }
        }
    };
    if(strategy === "velocity trend"){
        const klines = await KucoinLive.getKlines(trade.range_period);
        if(klines){
            const {velocity, direction} = calculateVelocity(klines);
            if(direction === "up"){
                const long = velocity >= trade.range_target_high;
                isLong = long;
            } else {
                const short = velocity >= trade.range_target_low;
                isShort = short;
            }
        }
    };

    // Trend
    if(strategy === "trend trend"){
        const klines = await KucoinLive.getKlines(trade.range_period);
        if(klines){
            const value = calculateTrend(klines).slice(-1)[0];
            const long = value >= trade.range_target_high;
            isLong = long;
            const short = value <= trade.range_target_low;
            isShort = short;
        }
    };
    if(strategy === "trend counter"){
        const klines = await KucoinLive.getKlines(trade.range_period);
        if(klines){
            const value = calculateTrend(klines).slice(-1)[0];
            const short = value >= trade.range_target_high;
            isShort = short;
            const long = value <= trade.range_target_low;
            isLong = long;
        }
    };

    const isNoSide = !isLong && !isShort;

    const side: "buy" | "sell" = isLong ? "buy" : "sell";

    return { 
        isNoSide,
        isLong,
        isShort,
        side,
    };
};

export const cooldown = (trade: ITrades) => {
    if(trade.range_cooldown_minute === 0) return false;
    const future = new Date(trade.createdAt).getTime() + (trade.range_cooldown_minute * 60 * 1000);
    const isOnCooldown = future >= Date.now();
    return isOnCooldown;
};

export const calc_entry_price = async ({trade, price, KucoinLive}: {KucoinLive: any, trade: ITrades, price: number}) => {
    const is_entry_calculated = trade.open_long === 0 && trade.open_short === 0;
    if(is_entry_calculated === false) return false;
    let [open_long, open_short] = [0,0];
    if(trade.strategy.toLowerCase().includes("high low")){
        const klines: Klines = await KucoinLive.getKlines(5);
        open_long = Math.max(...klines.map((data) => data[2]));
        open_short = Math.min(...klines.map((data) => data[3]));
    } else {
        open_long = Number(price + Number(trade.range_long || 0));
        open_short = Number(price - Number(trade.range_short || 0));
    };
    await Trades.findByIdAndUpdate(trade._id, { open_short, open_long }, {new: true});
    return true;
};

export const clean_up_close_position = async ({trade, price}: {trade: ITrades, price: number}) => {
    await Orders.create({
        ...trade.toObject(),
        _id: null,
        tradeId: trade._id,
        close_price: price,
        profit_loss: (trade.side === "buy" ? (price-trade.open_price) : (trade.open_price-price)) * trade.position_size,
        closedAt: new Date(),
    });
    await Trades.findByIdAndUpdate(trade._id, {
        orderId: "",
        side: "",
        open_short: 0,
        open_long: 0,
        createdAt: new Date(),
    }, {new: true});
} 

export const quick_close_position = async ({trade, price, KucoinLive}: {trade: ITrades, price: number, KucoinLive: any }) => {
    if(trade.live){
        const close = await KucoinLive.closePosition(trade.orderId);
        if(!close) return false;
        const position = await KucoinLive.getPosition(close.orderId);
        if(!position) return false;
        await clean_up_close_position({trade, price: position.markPrice || price});
    } else {
        await clean_up_close_position({trade, price});
    };
};

export const close_position = async ({trade, price, KucoinLive}: {trade: ITrades, price: number, KucoinLive: any }) => {
    if(trade.live){
        const position = await KucoinLive.getPosition(trade.orderId);
        if(position.isOpen === false) await clean_up_close_position({trade, price});
    };
    const stop_loss_hit = trade.side.toLowerCase() === "buy" ? trade.open_stop_loss >= price : price >= trade.open_stop_loss;
    const time_expired = trade.range_time === 0 ? false : timeExpire(trade.createdAt, trade.range_time) < 0;
    // profit or loss will close via stop losss.
    if(stop_loss_hit || time_expired){
        await quick_close_position({trade, price, KucoinLive});
        return;
    };
    const take_profit_hit = trade.side.toLowerCase() === "buy" ? price >= trade.open_take_profit : price <= trade.open_take_profit;
    // trailing take profit, keep increasing the range of profit taking to match volatility.
    if(take_profit_hit){
        await Trades.findByIdAndUpdate(trade._id, {
            open_stop_loss: trade.side === "buy" ? price - (trade.range_stop_loss*0.05) : price + (trade.range_stop_loss*0.05),
            open_take_profit: trade.side === "buy" ? price + trade.range_take_profit : price - trade.range_take_profit
        }, {new: true});
        return;
    };
};

const quick_open_position = async ({trade, price, orderId, side}: {trade: ITrades, price: number, orderId: string, side: "buy" | "sell"}) => {
    await Trades.findByIdAndUpdate(trade._id, {
        orderId,
        side,
        open_price: price,
        open_stop_loss: side === "buy" ? price - trade.range_stop_loss : price + trade.range_stop_loss,
        open_take_profit: side === "buy" ? price + trade.range_take_profit : price - trade.range_take_profit,
        createdAt: new Date()
    }, {new: true});
};

export const open_position = async ({trade, price, side, KucoinLive}: {trade: ITrades, price: number, side: "buy" | "sell", KucoinLive: any}) => {
    if(trade.live){
        const open = await KucoinLive.placePosition({ 
            side: side, 
            leverage: trade.leverage, 
            size: trade.position_size, 
            price: price
        });
        if(!open) {
            await Trades.findByIdAndUpdate(trade._id, {action: "break"}, {new:true});
            return;
        };
        const position = await KucoinLive.getPosition(open.orderId);
        if(!position) {
            await Trades.findByIdAndUpdate(trade._id, {action: "break"}, {new:true});
            return;
        };
        await quick_open_position({
            trade,
            side,
            orderId: position.id,
            price: position.avgEntryPrice, 
        });
    } else {
        await quick_open_position({
            trade, 
            side,
            orderId: `test-order-id-${generateid(3)}`,
            price: price, 
        });
    };
};

// Break - This action will stop trade from running, any trade open will close
export const action_break = async ({trade, price, KucoinLive} : {trade: ITrades, price: number, KucoinLive: any}) => {
    trade.running = false;
    trade.action = "bot";
    if(trade.orderId){
        await quick_close_position({ trade, price, KucoinLive });
    } else {
        await Trades.findByIdAndUpdate(trade._id, trade, {new: true});
    }
};

// Manual - This action will close position, any trade open will close
export const action_manual = async ({trade, price, KucoinLive} : {trade: ITrades, price: number, KucoinLive: any}) => {
    if(trade.orderId){
        trade.action = "manual"
        await quick_close_position({ trade, price, KucoinLive });
    } else {
        trade.action = "bot";
        await Trades.findByIdAndUpdate(trade._id, trade, {new: true});
    }
};

// Delete - This action will delete position, any trade open will close
export const action_delete = async ({trade, price, KucoinLive} : {trade: ITrades, price: number, KucoinLive: any}) => {
    if(trade.orderId){
        trade.action = "delete"
        await quick_close_position({ trade, price, KucoinLive });
    };
    await Trades.findByIdAndDelete(trade._id);
};
