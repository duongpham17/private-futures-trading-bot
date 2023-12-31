import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@redux/hooks/useRedux';
import Trades from '@redux/actions/trades';
import useQuery from '@hooks/useQuery';
import useOpen from '@hooks/useOpen';

import Loading from '@components/loading/Spinner';
import Select from '@components/options/Style1';

import Period from './Period';
import Prices from './Prices';
import Strength from './Strength';
import Rsi from './Rsi';
import Volume from './Volume';
import Velocity from './velocity';

const Chart = () => {

    const [ dispatch, query ] = [useAppDispatch(), useQuery()];

    const { klines, latest_price } = useAppSelector(state => state.trades);

    const { openLocal, onOpenLocal } = useOpen({initialState: "rsi", local: "trade-charts"});

    const filter = query.getQuery().replace("?", "").replaceAll("&", ",");

    useEffect(() => {
      let interval = setInterval(() => dispatch(Trades.klines(filter)), 10000);
      dispatch(Trades.klines(filter));
      return () => clearInterval(interval);
    }, [dispatch, filter]);

    useEffect(() => {
      document.title = `${query.getQueryValue("symbol")} ${latest_price}`;
    }, [latest_price, query]);

    const onChartSelection = (item: string | number) => {
      const str = item.toString();
      if(openLocal.includes(str)){
        const filter = openLocal.split(" ").filter((el: any) => el !== str).join(" ");
        onOpenLocal(filter);
      } else {
        const new_items = `${openLocal} ${str}`;
        onOpenLocal(new_items, false);
      };
    };
    
    return ( !klines ? <Loading size={50} center/> : 
      <>
      
        <Period />

        <Prices klines={klines} />

        <Select 
          color="plain" 
          items={["rsi", "strength", "volume", "velocity"]} 
          onClick={onChartSelection} selected={openLocal} 
        />

        {openLocal.includes("rsi") && <Rsi klines={klines} />}

        {openLocal.includes("strength") && <Strength klines={klines}/>}

        {openLocal.includes("volume") && <Volume klines={klines} />}

        {openLocal.includes("velocity") && <Velocity klines={klines} />}

      </>  
    )
}

export default Chart